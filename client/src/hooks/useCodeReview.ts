import { useState, useCallback, useRef, useEffect } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import type * as monaco from "monaco-editor";

export interface ReviewComment {
    line: number;
    severity: "info" | "warning" | "error";
    message: string;
}

const SEVERITY_CONFIG = {
    error: {
        className: "review-line-error",
        glyphClassName: "review-glyph-error",
        laneColor: "#ef4444",
        markerSeverity: 8 as const, // MarkerSeverity.Error
    },
    warning: {
        className: "review-line-warning",
        glyphClassName: "review-glyph-warning",
        laneColor: "#eab308",
        markerSeverity: 4 as const, // MarkerSeverity.Warning
    },
    info: {
        className: "review-line-info",
        glyphClassName: "review-glyph-info",
        laneColor: "#3b82f6",
        markerSeverity: 2 as const, // MarkerSeverity.Info
    },
};

interface UseCodeReviewReturn {
    /** Trigger a code review */
    requestReview: (code: string, problem: string, language: string) => Promise<void>;
    /** Clear all review decorations */
    clearReview: () => void;
    /** Current review comments */
    comments: ReviewComment[];
    /** Whether a review is in progress */
    loading: boolean;
    /** Whether review results are displayed */
    hasReview: boolean;
}

export function useCodeReview(
    editorRef: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>,
    monacoRef: React.RefObject<typeof monaco | null>
): UseCodeReviewReturn {
    const [comments, setComments] = useState<ReviewComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasReview, setHasReview] = useState(false);
    const decorationIdsRef = useRef<string[]>([]);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const applyDecorations = useCallback(
        (reviewComments: ReviewComment[]) => {
            const editor = editorRef.current;
            const monacoInst = monacoRef.current;
            if (!editor || !monacoInst) return;

            const model = editor.getModel();
            const maxLine = model ? Math.max(1, model.getLineCount()) : 1;

            // Create editor decorations (inline highlights + glyph margin)
            const decorations: monaco.editor.IModelDeltaDecoration[] = reviewComments.map((comment) => {
                const config = SEVERITY_CONFIG[comment.severity] || SEVERITY_CONFIG.info;
                const safeLine = Math.max(1, Math.min(comment.line || 1, maxLine));
                return {
                    range: new monacoInst.Range(safeLine, 1, safeLine, 1),
                    options: {
                        isWholeLine: true,
                        className: config.className,
                        glyphMarginClassName: config.glyphClassName,
                        glyphMarginHoverMessage: { value: `**${comment.severity.toUpperCase()}**: ${comment.message}` },
                        hoverMessage: { value: comment.message },
                        overviewRuler: {
                            color: config.laneColor,
                            position: monacoInst.editor.OverviewRulerLane.Right,
                        },
                        minimap: {
                            color: config.laneColor,
                            position: monacoInst.editor.MinimapPosition.Inline,
                        },
                    },
                };
            });

            decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations);

            // Also set Monaco markers for the problems panel
            if (model) {
                const markers: monaco.editor.IMarkerData[] = reviewComments.map((comment) => {
                    const config = SEVERITY_CONFIG[comment.severity] || SEVERITY_CONFIG.info;
                    const safeLine = Math.max(1, Math.min(comment.line || 1, maxLine));
                    return {
                        severity: config.markerSeverity,
                        message: comment.message,
                        startLineNumber: safeLine,
                        startColumn: 1,
                        endLineNumber: safeLine,
                        endColumn: model.getLineMaxColumn(safeLine),
                    };
                });
                monacoInst.editor.setModelMarkers(model, "ai-review", markers);
            }
        },
        [editorRef, monacoRef]
    );

    const clearReview = useCallback(() => {
        const editor = editorRef.current;
        const monacoInst = monacoRef.current;
        if (editor) {
            decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
        }
        if (monacoInst && editor) {
            const model = editor.getModel();
            if (model) {
                monacoInst.editor.setModelMarkers(model, "ai-review", []);
            }
        }
        setComments([]);
        setHasReview(false);
    }, [editorRef, monacoRef]);

    const requestReview = useCallback(
        async (code: string, problem: string, language: string) => {
            if (!code.trim()) {
                toast.error("Write some code first!");
                return;
            }

            setLoading(true);
            clearReview();

            try {
                const res = await api.post("/ai/review", { code, problem, language });
                const reviewComments: ReviewComment[] = res.data.data || res.data;

                if (!isMountedRef.current) return;

                if (reviewComments.length === 0) {
                    toast.success("✅ No issues found — your code looks great!");
                    setHasReview(true);
                    return;
                }

                setComments(reviewComments);
                setHasReview(true);
                applyDecorations(reviewComments);

                const errorCount = reviewComments.filter((c) => c.severity === "error").length;
                const warnCount = reviewComments.filter((c) => c.severity === "warning").length;
                const infoCount = reviewComments.filter((c) => c.severity === "info").length;

                const parts: string[] = [];
                if (errorCount) parts.push(`${errorCount} error${errorCount > 1 ? "s" : ""}`);
                if (warnCount) parts.push(`${warnCount} warning${warnCount > 1 ? "s" : ""}`);
                if (infoCount) parts.push(`${infoCount} suggestion${infoCount > 1 ? "s" : ""}`);

                toast(`🔍 Review: ${parts.join(", ")}`, { icon: "📝" });
            } catch {
                if (isMountedRef.current) toast.error("Code review failed. Try again.");
            } finally {
                if (isMountedRef.current) setLoading(false);
            }
        },
        [clearReview, applyDecorations]
    );

    return { requestReview, clearReview, comments, loading, hasReview };
}
