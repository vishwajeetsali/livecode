import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { prisma } from "../lib/prisma.js";

const messageSync = 0;
const messageAwareness = 1;

class WSSharedDoc extends Y.Doc {
    name: string;
    conns: Map<WebSocket, Set<number>>;
    awareness: awarenessProtocol.Awareness;

    constructor(name: string) {
        super({ gc: true });
        this.name = name;
        this.conns = new Map();
        this.awareness = new awarenessProtocol.Awareness(this);
        this.awareness.setLocalState(null);

        const awarenessChangeHandler = (
            { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
            conn: WebSocket | null
        ) => {
            const changedClients = added.concat(updated, removed);
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
            );
            const buff = encoding.toUint8Array(encoder);
            this.conns.forEach((_, c) => {
                if (c.readyState === WebSocket.OPEN) {
                    c.send(buff);
                }
            });
        };
        this.awareness.on("update", awarenessChangeHandler);

        this.on("update", (update: Uint8Array, origin: any) => {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeUpdate(encoder, update);
            const message = encoding.toUint8Array(encoder);
            this.conns.forEach((_, c) => {
                if (c !== origin && c.readyState === WebSocket.OPEN) {
                    c.send(message);
                }
            });
        });
    }
}

// In-memory Yjs document store: docName -> WSSharedDoc
const docs = new Map<string, WSSharedDoc>();

function getYDoc(docName: string): WSSharedDoc {
    if (!docs.has(docName)) {
        const doc = new WSSharedDoc(docName);
        docs.set(docName, doc);
        logger.info("Yjs doc created", { docName });
    }
    return docs.get(docName)!;
}

const messageListener = (conn: WebSocket, doc: WSSharedDoc, message: Uint8Array) => {
    try {
        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);
        switch (messageType) {
            case messageSync:
                encoding.writeVarUint(encoder, messageSync);
                syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
                if (encoding.length(encoder) > 1) {
                    conn.send(encoding.toUint8Array(encoder));
                }
                break;
            case messageAwareness: {
                awarenessProtocol.applyAwarenessUpdate(
                    doc.awareness,
                    decoding.readVarUint8Array(decoder),
                    conn
                );
                break;
            }
        }
    } catch (err) {
        logger.error("Yjs protocol error", { error: err instanceof Error ? err.message : String(err) });
    }
};

/**
 * Robust Yjs WebSocket sync server compliant with y-websocket and y-protocols.
 */
export function initYjsServer(server: HttpServer) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
        const host = request.headers.host || "localhost";
        const url = new URL(request.url || "/", `http://${host}`);
        if (url.pathname.startsWith("/yjs")) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        }
    });

    wss.on("connection", async (ws: WebSocket, req) => {
        const host = req.headers.host || "localhost";
        const url = new URL(req.url || "/", `http://${host}`);
        const pathParts = url.pathname.split("/").filter(Boolean);
        const docName = url.searchParams.get("room") || 
            (pathParts.length > 1 ? pathParts[pathParts.length - 1]! : pathParts[0]!) || 
            "default";

        // JWT authentication — reject connections with missing or invalid tokens
        const token = url.searchParams.get("token");
        if (!token) {
            logger.warn("Yjs connection rejected: no token provided", { docName });
            ws.close(4001, "Authentication required");
            return;
        }

        let userId = "";
        try {
            const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };
            userId = decoded.userId;
        } catch {
            logger.warn("Yjs connection rejected: invalid or expired token", { docName });
            ws.close(4001, "Invalid or expired token");
            return;
        }

        const doc = getYDoc(docName);
        const controlledUserIds = new Set<number>();
        doc.conns.set(ws, controlledUserIds);

        ws.on("message", (message: ArrayBuffer | Buffer) => {
            messageListener(ws, doc, new Uint8Array(message));
        });

        // 1. Send sync step 1
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeSyncStep1(encoder, doc);
        ws.send(encoding.toUint8Array(encoder));

        // 2. Send current awareness states
        const awarenessStates = doc.awareness.getStates();
        if (awarenessStates.size > 0) {
            const awarenessEncoder = encoding.createEncoder();
            encoding.writeVarUint(awarenessEncoder, messageAwareness);
            encoding.writeVarUint8Array(
                awarenessEncoder,
                awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys()))
            );
            ws.send(encoding.toUint8Array(awarenessEncoder));
        }

        ws.on("close", () => {
            doc.conns.delete(ws);
            awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledUserIds), null);
            logger.info("Yjs client disconnected", { docName, userId });
        });

        logger.info("Yjs client connected & synced", { docName, userId });
    });

    logger.info("Yjs WebSocket server initialized on /yjs");
    return wss;
}

/**
 * Get the current text content of a Yjs room document.
 */
export function getYDocText(roomId: string): string {
    const doc = docs.get(`room-${roomId}`);
    if (!doc) return "";
    return doc.getText("monaco").toString();
}
