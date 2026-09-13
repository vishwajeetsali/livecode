import { useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { getSupportedMimeType } from "../utils/helper";

export const useAudioRecorder = (mode: "mixed" | "mic-only", isActive: boolean) => {
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const mimeTypeRef = useRef<string>("audio/webm");
    
    const audioCtxRef = useRef<AudioContext | null>(null);
    const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const remoteSourceAddedRef = useRef(false);

    useEffect(() => {
        if (!isActive || mode !== "mic-only") return;
        
        const startMic = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mimeType = getSupportedMimeType();
                mimeTypeRef.current = mimeType || "audio/webm";
                const recorder = mimeType
                    ? new MediaRecorder(stream, { mimeType })
                    : new MediaRecorder(stream);
                recorderRef.current = recorder;
                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
                recorder.start();
            } catch {
                toast.error("Microphone unavailable. Continuing without audio analysis.");
            }
        };
        startMic();

        return () => {
            if (recorderRef.current && recorderRef.current.state !== "inactive") {
                recorderRef.current.stop();
                recorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        };
    }, [isActive, mode]);

    const startMixedRecorder = (localStream: MediaStream) => {
        if (mode !== "mixed") return;

        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
            audioCtxRef.current.close().catch(() => {});
        }
        
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const mixDest = audioCtx.createMediaStreamDestination();
        mixDestRef.current = mixDest;
        remoteSourceAddedRef.current = false;

        const localAudioOnly = new MediaStream(localStream.getAudioTracks());
        audioCtx.createMediaStreamSource(localAudioOnly).connect(mixDest);

        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
        
        const mimeType = getSupportedMimeType();
        mimeTypeRef.current = mimeType || "audio/webm";
        const recorder = mimeType
            ? new MediaRecorder(mixDest.stream, { mimeType })
            : new MediaRecorder(mixDest.stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.start();
    };

    const addRemoteStream = (stream: MediaStream) => {
        if (audioCtxRef.current && mixDestRef.current && !remoteSourceAddedRef.current && audioCtxRef.current.state !== "closed") {
            const remoteAudioTracks = stream.getAudioTracks();
            if (remoteAudioTracks.length > 0) {
                remoteSourceAddedRef.current = true;
                const remoteAudioOnly = new MediaStream(remoteAudioTracks);
                audioCtxRef.current.createMediaStreamSource(remoteAudioOnly).connect(mixDestRef.current);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (recorderRef.current && recorderRef.current.state !== "inactive") {
                recorderRef.current.stop();
            }
            if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    return {
        recorderRef,
        chunksRef,
        mimeTypeRef,
        startMixedRecorder,
        addRemoteStream
    };
};
