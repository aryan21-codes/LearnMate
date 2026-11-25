import React, { useState } from "react";
import { Activity, BookOpen, BrainCircuit, FileText, Film, Layers, Play, Sparkles } from "lucide-react";
import type { CitationItem, MasteryRecord, StudyDocument, VideoWalkthroughResponse } from "../../types";
import { api } from "../../services/api";
import { MermaidDiagram } from "../whiteboard/MermaidDiagram";
import { VideoExplainerPlayer } from "../whiteboard/VideoExplainerPlayer";

interface LearningIntelPanelProps {
  sessionId?: string;
  currentTopic: string;
  latestDiagram: {
    title?: string | null;
    mermaid?: string | null;
    fallbackText?: string | null;
  } | null;
  latestCitations: CitationItem[];
  documents: StudyDocument[];
  masteryRecords: MasteryRecord[];
}

export const LearningIntelPanel: React.FC<LearningIntelPanelProps> = ({
  sessionId,
  currentTopic,
  latestDiagram,
  latestCitations,
  documents,
  masteryRecords,
}) => {
  const [tab, setTab] = useState<"whiteboard" | "video" | "references" | "intel">("whiteboard");
  const [videoWalkthrough, setVideoWalkthrough] = useState<VideoWalkthroughResponse | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    if (!sessionId) return;
    setVideoLoading(true);
    setVideoError(null);
    try {
      const resp = await api.createVideoWalkthrough({
        session_id: sessionId,
        topic: currentTopic,
        concept: latestDiagram?.title || currentTopic,
        target_duration_seconds: 45,
      });
      setVideoWalkthrough(resp);
      setTab("video");
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Failed to generate video walkthrough.");
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-slate-50/70 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab("whiteboard")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === "whiteboard"
                ? "bg-white border-2 border-slate-900 text-slate-900 shadow-sm"
                : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            Smart Whiteboard
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("video");
              if (!videoWalkthrough && !videoLoading) {
                void handleGenerateVideo();
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === "video"
                ? "bg-white border-2 border-indigo-600 text-indigo-900 shadow-sm"
                : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Film className="h-3.5 w-3.5 text-indigo-600" />
            Video Explainer
            {videoLoading && <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />}
          </button>
          <button
            type="button"
            onClick={() => setTab("references")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === "references"
                ? "bg-white border-2 border-teal-600 text-teal-900 shadow-sm"
                : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-teal-600" />
            References ({latestCitations.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("intel")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              tab === "intel"
                ? "bg-white border-2 border-violet-600 text-violet-900 shadow-sm"
                : "border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5 text-violet-600" />
            Mastery
          </button>
        </div>
        <span className="hidden sm:inline text-xs text-slate-500 font-medium">
          Topic: <strong className="text-slate-900">{currentTopic}</strong>
        </span>
      </div>

      <div className="p-4">
        {tab === "whiteboard" && (
          <div className="space-y-3.5">
            {/* Quick Action to turn Whiteboard Diagram into animated Video Walkthrough */}
            {sessionId && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <Film className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs text-indigo-950 font-bold">
                    Transform this concept into an animated video walkthrough?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateVideo()}
                  disabled={videoLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition"
                >
                  {videoLoading ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-spin" />
                      <span>Directing video...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      <span>Generate AI Video</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {latestDiagram?.mermaid ? (
              <MermaidDiagram
                definition={latestDiagram.mermaid}
                title={latestDiagram.title}
                fallbackText={latestDiagram.fallbackText}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center">
                <Layers className="mb-2 h-7 w-7 text-slate-400" />
                <p className="font-display text-sm font-bold text-slate-900">
                  Visual Diagrams Render Here
                </p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  When the tutor explains algorithms, flows, or concept relationships, structured
                  Mermaid diagrams render automatically on this smart whiteboard.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "video" && (
          <div className="space-y-3.5">
            {videoLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50/50 py-14 text-center">
                <Film className="h-8 w-8 text-indigo-600 animate-bounce mb-3" />
                <h4 className="font-display text-sm font-bold text-indigo-950">
                  Generating Animated Video Storyboard...
                </h4>
                <p className="mt-1 max-w-sm text-xs text-indigo-800/80">
                  The AI is structuring key visual scenes, generating whiteboard diagrams, and writing
                  synchronized voice narration for &ldquo;{currentTopic}&rdquo;.
                </p>
              </div>
            ) : videoError ? (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 shadow-sm">
                <p className="font-bold mb-1">Failed to generate video walkthrough</p>
                <p className="text-rose-800 mb-3">{videoError}</p>
                <button
                  type="button"
                  onClick={() => void handleGenerateVideo()}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 font-bold text-white hover:bg-rose-700 shadow-sm"
                >
                  Retry Video Generation
                </button>
              </div>
            ) : videoWalkthrough ? (
              <VideoExplainerPlayer walkthrough={videoWalkthrough} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center">
                <Film className="h-8 w-8 text-indigo-600 mb-2" />
                <h4 className="font-display text-sm font-bold text-slate-900">No Video Walkthrough Yet</h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500 mb-3">
                  Turn &ldquo;{currentTopic}&rdquo; into a multi-scene animated whiteboard video with AI voice narration.
                </p>
                <button
                  type="button"
                  onClick={() => void handleGenerateVideo()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Generate Video Explainer</span>
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "references" && (
          <div className="space-y-3">
            {latestCitations.length > 0 ? (
              latestCitations.map((c, idx) => (
                <div
                  key={`${c.document_id}-${idx}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs shadow-sm hover:bg-white transition"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-bold text-teal-800">
                      {c.document_name} — Page {c.page_number}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                      relevance {c.score}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">{c.snippet}...</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center text-xs text-slate-500">
                No citations matched the latest prompt yet.
              </div>
            )}

            {documents.length > 0 && (
              <div className="pt-2">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Attached Study PDFs
                </div>
                <div className="flex flex-wrap gap-2">
                  {documents.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      {d.file_name} ({d.page_count}p)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "intel" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-teal-600" />
                Evidence-based mastery estimates (updated from evaluated responses)
              </span>
            </div>
            {masteryRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center text-xs text-slate-500">
                Answer a follow-up or quiz question to generate live mastery estimates.
              </div>
            ) : (
              <div className="space-y-2.5">
                {masteryRecords.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm hover:bg-white transition"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{m.concept}</span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          m.mastery_score >= 70
                            ? "text-emerald-700"
                            : m.mastery_score >= 50
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        ~{Math.round(m.mastery_score)}% est. ({m.correct_attempts}/{m.attempts})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.mastery_score >= 70
                            ? "bg-emerald-500"
                            : m.mastery_score >= 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, m.mastery_score))}%` }}
                      />
                    </div>
                    {m.last_misconception && (
                      <p className="mt-1.5 text-xs text-amber-800 font-medium">
                        Note: {m.last_misconception}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
