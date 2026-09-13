import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { WebsocketProvider } from "y-websocket";
import type * as monaco from "monaco-editor";

const BASE_WS_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000")
    .replace(/^http/, "ws");

interface UseYjsCollaborationOptions {
    roomId: string | undefined;
    enabled?: boolean;
}

interface UseYjsCollaborationReturn {
    /** Bind the Yjs document to a Monaco editor instance */
    bindEditor: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance?: typeof monaco) => void;
    /** Get the current text content from the Yjs document */
    getText: () => string;
    /** Set the text content of the Yjs document (broadcasts to all participants) */
    setText: (text: string) => void;
    /** Get the Yjs document */
    getYDoc: () => Y.Doc | null;
    /** Whether the document is synced with the WebSocket server */
    synced: boolean;
}

export function useYjsCollaboration({ roomId, enabled = true }: UseYjsCollaborationOptions): UseYjsCollaborationReturn {
    const ydocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const [synced, setSynced] = useState(false);

    const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    const createBinding = (editor: monaco.editor.IStandaloneCodeEditor, ydoc: Y.Doc, provider: WebsocketProvider) => {
        bindingRef.current?.destroy();
        const ytext = ydoc.getText("monaco");
        const model = editor.getModel();
        if (!model) return;

        const binding = new MonacoBinding(
            ytext,
            model,
            new Set([editor]),
            provider.awareness
        );
        bindingRef.current = binding;
    };

    // Initialize Yjs doc and provider
    useEffect(() => {
        if (!roomId || !enabled) return;

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        // Pass JWT token for Yjs WebSocket authentication
        const token = localStorage.getItem("accessToken") || "";
        const wsUrl = `${BASE_WS_URL}/yjs`;

        const provider = new WebsocketProvider(
            wsUrl,
            `room-${roomId}`,
            ydoc,
            { params: { token } }
        );
        providerRef.current = provider;

        const handleSync = (isSynced: boolean) => {
            setSynced(isSynced);
        };
        provider.on("sync", handleSync);
        if (provider.synced) {
            setSynced(true);
        }

        // If editor is already mounted, bind immediately
        if (editorInstanceRef.current) {
            createBinding(editorInstanceRef.current, ydoc, provider);
        }

        // Update token on reconnect so expired JWTs don't block Yjs sync
        const handleStatus = ({ status }: { status: string }) => {
            if (status === "connecting") {
                const freshToken = localStorage.getItem("accessToken") || "";
                if (freshToken && freshToken !== (provider as any).params?.token) {
                    (provider as any).params = { token: freshToken };
                    try {
                        (provider as any).url = `${wsUrl}?token=${encodeURIComponent(freshToken)}`;
                    } catch {
                        // Some versions of y-websocket don't allow url reassignment
                    }
                }
            }
        };
        provider.on("status", handleStatus);

        return () => {
            provider.off("sync", handleSync);
            provider.off("status", handleStatus);
            bindingRef.current?.destroy();
            bindingRef.current = null;
            provider.disconnect();
            provider.destroy();
            ydoc.destroy();
            ydocRef.current = null;
            providerRef.current = null;
            setSynced(false);
        };
    }, [roomId, enabled]);

    // Bind Monaco editor to the Y.Text type
    const bindEditor = useCallback(
        (editor: monaco.editor.IStandaloneCodeEditor) => {
            editorInstanceRef.current = editor;
            const ydoc = ydocRef.current;
            const provider = providerRef.current;
            if (!ydoc || !provider) return;
            createBinding(editor, ydoc, provider);
        },
        []
    );

    const getText = useCallback(() => {
        if (!ydocRef.current) return "";
        return ydocRef.current.getText("monaco").toString();
    }, []);

    const setText = useCallback((newText: string) => {
        const normalized = (newText || "").replace(/\r\n/g, "\n");
        const editor = editorInstanceRef.current;
        const model = editor?.getModel();
        const ydoc = ydocRef.current;

        // 1. Update Yjs doc transaction so Yjs updates all remote peers via WebSocket
        if (ydoc) {
            const ytext = ydoc.getText("monaco");
            if (ytext.toString() !== normalized) {
                ydoc.transact(() => {
                    ytext.delete(0, ytext.length);
                    ytext.insert(0, normalized);
                });
            }
        }

        // 2. Ensure local Monaco model matches normalized text directly
        if (model && model.getValue() !== normalized) {
            model.setValue(normalized);
        }
    }, []);

    const getYDoc = useCallback(() => {
        return ydocRef.current;
    }, []);

    return {
        bindEditor,
        getText,
        setText,
        getYDoc,
        synced,
    };
}
