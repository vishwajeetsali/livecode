import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Socket } from "socket.io-client";

// ─── ICE Server Configuration ────────────────────────────────────────────────
// TURN servers are essential for WebRTC behind symmetric NATs / corporate firewalls.
// Configure via environment variables: VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL
// Providers: Twilio, Metered.ca, Xirsys, or self-hosted coturn
const buildIceServers = (): RTCIceServer[] => {
    const servers: RTCIceServer[] = [
        // Free STUN servers (sufficient for direct connections)
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ];

    // TURN server for NAT traversal (required for ~15% of connections)
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnUrl && turnUsername && turnCredential) {
        servers.push(
            { urls: turnUrl, username: turnUsername, credential: turnCredential },
            // Also add TURNS (TLS) variant if using a turns:// URL
            ...(turnUrl.startsWith("turn:")
                ? [{ urls: turnUrl.replace("turn:", "turns:"), username: turnUsername, credential: turnCredential }]
                : [])
        );
    }

    return servers;
};

interface UseWebRTCProps {
    roomId: string | undefined;
    isInterviewer: boolean;
    socket: Socket;
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (stream: MediaStream) => void;
}

export const useWebRTC = ({ roomId, isInterviewer, socket, onLocalStream, onRemoteStream }: UseWebRTCProps) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [cameraAllowed, setCameraAllowed] = useState(true);
    const [remoteConnected, setRemoteConnected] = useState(false);
    const [remoteHasVideo, setRemoteHasVideo] = useState(false);
    const onLocalStreamRef = useRef(onLocalStream);
    const onRemoteStreamRef = useRef(onRemoteStream);

    useEffect(() => {
        onLocalStreamRef.current = onLocalStream;
    }, [onLocalStream]);

    useEffect(() => {
        onRemoteStreamRef.current = onRemoteStream;
    }, [onRemoteStream]);

    useEffect(() => {
        if (!roomId) return;
        let isMounted = true;
        let readyInterval: ReturnType<typeof setInterval> | null = null;
        const iceCandidateQueue: RTCIceCandidateInit[] = [];

        const setupPeerConnection = () => {
            if (peerRef.current) {
                try {
                    peerRef.current.onconnectionstatechange = null;
                    peerRef.current.ontrack = null;
                    peerRef.current.onicecandidate = null;
                    peerRef.current.close();
                } catch {}
                peerRef.current = null;
            }

            const peer = new RTCPeerConnection({
                iceServers: buildIceServers(),
                iceCandidatePoolSize: 10,
            });
            peerRef.current = peer;

            // Attach local tracks if available
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    peer.addTrack(track, localStreamRef.current!);
                });
            }

            peer.onconnectionstatechange = () => {
                if (!isMounted) return;
                const state = peer.connectionState;
                if (state === "connected") {
                    setRemoteConnected(true);
                } else if (state === "disconnected" || state === "failed" || state === "closed") {
                    if (peer.iceConnectionState !== "connected" && peer.iceConnectionState !== "completed") {
                        setRemoteConnected(false);
                        setRemoteHasVideo(false);
                    }
                }
            };

            peer.oniceconnectionstatechange = () => {
                if (!isMounted) return;
                const state = peer.iceConnectionState;
                if (state === "connected" || state === "completed") {
                    setRemoteConnected(true);
                } else if (state === "disconnected" || state === "failed" || state === "closed") {
                    if (peer.connectionState !== "connected") {
                        setRemoteConnected(false);
                        setRemoteHasVideo(false);
                    }
                }
            };

            peer.ontrack = (e) => {
                const remoteStream = e.streams[0] || new MediaStream([e.track]);
                if (remoteVideoRef.current && remoteStream) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(() => {});
                }
                if (isMounted && remoteStream) {
                    setRemoteConnected(true);
                    const hasLiveVideo = remoteStream.getVideoTracks().some(
                        (t) => t.enabled && t.readyState === "live"
                    );
                    setRemoteHasVideo(hasLiveVideo);

                    remoteStream.onaddtrack = () => {
                        if (isMounted) {
                            setRemoteHasVideo(
                                remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live")
                            );
                        }
                    };
                    remoteStream.onremovetrack = () => {
                        if (isMounted) {
                            setRemoteHasVideo(
                                remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live")
                            );
                        }
                    };
                }
                if (onRemoteStreamRef.current && remoteStream) {
                    onRemoteStreamRef.current(remoteStream);
                }
            };

            peer.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit("iceCandidate", { roomId, candidate: e.candidate });
                }
            };

            return peer;
        };

        const flushIceCandidates = async (peer: RTCPeerConnection) => {
            while (iceCandidateQueue.length > 0) {
                const cand = iceCandidateQueue.shift();
                if (cand) {
                    try {
                        await peer.addIceCandidate(cand);
                    } catch (e) {
                        if (import.meta.env.DEV) console.warn("Failed to add queued ICE candidate:", e);
                    }
                }
            }
        };

        const createAndSendOffer = async (forceRecreate = false) => {
            if (!isInterviewer) return;
            const currentPeer = peerRef.current;
            if (!forceRecreate && currentPeer) {
                if (currentPeer.connectionState === "connected" || currentPeer.iceConnectionState === "connected" || currentPeer.iceConnectionState === "completed") {
                    return;
                }
            }
            try {
                const peer = setupPeerConnection();
                iceCandidateQueue.length = 0;
                const offer = await peer.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                });
                await peer.setLocalDescription(offer);
                socket.emit("offer", { roomId, offer });
            } catch (e) {
                if (import.meta.env.DEV) console.warn("Failed to create offer:", e);
            }
        };

        // Named handler references for precise socket.off() cleanup (IMP-007)
        let handleCandidateReady: (() => void) | null = null;
        let handlePresenceUpdate: ((users: unknown[]) => void) | null = null;
        let handleOffer: ((offer: RTCSessionDescriptionInit) => void) | null = null;
        let handleAnswer: ((answer: RTCSessionDescriptionInit) => void) | null = null;
        let handleIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;

        const startVideo = async () => {
            try {
                let stream: MediaStream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                } catch {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    } catch {
                        stream = new MediaStream();
                    }
                    if (isMounted) setCameraAllowed(false);
                }

                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                    localVideoRef.current.play().catch(() => {});
                }
                if (onLocalStreamRef.current) onLocalStreamRef.current(stream);

                setupPeerConnection();

                if (isInterviewer) {
                    handleCandidateReady = () => {
                        const peer = peerRef.current;
                        if (!peer || (peer.connectionState !== "connected" && peer.iceConnectionState !== "connected")) {
                            createAndSendOffer(true);
                        }
                    };
                    socket.on("candidateReady", handleCandidateReady);
                } else {
                    socket.emit("candidateReady", { roomId });
                    readyInterval = setInterval(() => {
                        const peer = peerRef.current;
                        if (!peer || (peer.connectionState !== "connected" && peer.iceConnectionState !== "connected" && peer.iceConnectionState !== "completed")) {
                            socket.emit("candidateReady", { roomId });
                        }
                    }, 2000);
                }

                handlePresenceUpdate = (users: unknown[]) => {
                    if (Array.isArray(users)) {
                        if (users.length < 2) {
                            if (isMounted) {
                                setRemoteConnected(false);
                                setRemoteHasVideo(false);
                            }
                            if (remoteVideoRef.current) {
                                remoteVideoRef.current.srcObject = null;
                            }
                        } else if (users.length >= 2) {
                            if (isInterviewer) {
                                createAndSendOffer(true);
                            } else {
                                socket.emit("candidateReady", { roomId });
                            }
                        }
                    }
                };
                socket.on("presenceUpdate", handlePresenceUpdate);

                handleOffer = async (offer: RTCSessionDescriptionInit) => {
                    try {
                        const peer = setupPeerConnection();
                        iceCandidateQueue.length = 0;
                        await peer.setRemoteDescription(offer);
                        await flushIceCandidates(peer);
                        const answer = await peer.createAnswer();
                        await peer.setLocalDescription(answer);
                        socket.emit("answer", { roomId, answer });
                    } catch (e) {
                        if (import.meta.env.DEV) console.warn("Failed to handle offer:", e);
                    }
                };
                socket.on("offer", handleOffer);

                handleAnswer = async (answer: RTCSessionDescriptionInit) => {
                    const peer = peerRef.current;
                    if (!peer || (peer.signalingState !== "have-local-offer" && peer.signalingState !== "have-remote-offer")) return;
                    try {
                        await peer.setRemoteDescription(answer);
                        await flushIceCandidates(peer);
                    } catch (e) {
                        if (import.meta.env.DEV) console.warn("Failed to handle answer:", e);
                    }
                };
                socket.on("answer", handleAnswer);

                handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
                    const peer = peerRef.current;
                    if (peer && peer.remoteDescription && peer.remoteDescription.type) {
                        try {
                            await peer.addIceCandidate(candidate);
                        } catch (e) {
                            if (import.meta.env.DEV) console.warn("Failed to add ICE candidate:", e);
                        }
                    } else {
                        iceCandidateQueue.push(candidate);
                    }
                };
                socket.on("iceCandidate", handleIceCandidate);
            } catch (err) {
                if (isMounted) {
                    setCameraAllowed(false);
                    toast.error("Camera/microphone unavailable.");
                }
                if (import.meta.env.DEV) console.warn("Camera unavailable:", err);
            }
        };

        startVideo();

        return () => {
            isMounted = false;
            if (readyInterval) clearInterval(readyInterval);
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
            }
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
            if (peerRef.current) {
                try { peerRef.current.close(); } catch {}
                peerRef.current = null;
            }
            if (handleCandidateReady) socket.off("candidateReady", handleCandidateReady);
            if (handlePresenceUpdate) socket.off("presenceUpdate", handlePresenceUpdate);
            if (handleOffer) socket.off("offer", handleOffer);
            if (handleAnswer) socket.off("answer", handleAnswer);
            if (handleIceCandidate) socket.off("iceCandidate", handleIceCandidate);
        };
    }, [isInterviewer, roomId, socket]);

    return {
        localVideoRef,
        remoteVideoRef,
        cameraAllowed,
        remoteConnected,
        remoteHasVideo,
        localStreamRef,
        peerRef,
    };
};
