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
    <div className="flex flex-col rounded-2xl border border-slate-800/90 bg-navy-900/70">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab("whiteboard")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              tab === "whiteboard"
                ? "bg-accent-violet/20 text-violet-200 border border-violet-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
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
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              tab === "video"
                ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Film className="h-3.5 w-3.5 text-indigo-400" />
            🎬 Video Explainer
            {videoLoading && <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />}
          </button>
          <button
            type="button"
            onClick={() => setTab("references")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              tab === "references"
                ? "bg-accent-teal/20 text-teal-200 border border-teal-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            References ({latestCitations.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("intel")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              tab === "intel"
                ? "bg-accent-blue/20 text-blue-200 border border-blue-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            Mastery
          </button>
        </div>
        <span className="hidden sm:inline text-[11px] text-slate-400">
          Topic: <strong className="text-slate-200">{currentTopic}</strong>
        </span>
      </div>

      <div className="p-3.5">
        {tab === "whiteboard" && (
          <div className="space-y-3">
            {/* Quick Action to turn Whiteboard Diagram into animated Video Walkthrough */}
            {sessionId && (
              <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-navy-950 px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-slate-200 font-medium">
                    Want an animated video explanation of this topic?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateVideo()}
                  disabled={videoLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 transition"
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
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-navy-950/60 py-8 text-center">
                <Layers className="mb-2 h-6 w-6 text-slate-600" />
                <p className="text-xs font-medium text-slate-300">
                  Visual Explanations Appear Here
                </p>
                <p className="mt-1 max-w-xs text-[11px] text-slate-500">
                  When the tutor explains algorithms, flows, or concept relationships, structured
                  Mermaid diagrams render automatically on this whiteboard.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "video" && (
          <div className="space-y-3">
            {videoLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-navy-950/90 py-12 text-center">
                <Film className="h-8 w-8 text-indigo-400 animate-bounce mb-3" />
                <h4 className="text-sm font-semibold text-slate-200">
                  Generating Animated Video Storyboard...
                </h4>
                <p className="mt-1 max-w-sm text-xs text-slate-400">
                  The AI is structuring key visual scenes, generating whiteboard diagrams, and writing
                  synchronized voice narration for "{currentTopic}".
                </p>
              </div>
            ) : videoError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                <p className="font-semibold mb-1">Failed to generate video walkthrough</p>
                <p className="text-rose-200/80 mb-3">{videoError}</p>
                <button
                  type="button"
                  onClick={() => void handleGenerateVideo()}
                  className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-500"
                >
                  Retry Video Generation
                </button>
              </div>
            ) : videoWalkthrough ? (
              <VideoExplainerPlayer walkthrough={videoWalkthrough} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-navy-950/80 py-10 text-center">
                <Film className="h-8 w-8 text-indigo-400 mb-2" />
                <h4 className="text-xs font-semibold text-slate-200">No Video Walkthrough Yet</h4>
                <p className="mt-1 max-w-xs text-[11px] text-slate-400 mb-3">
                  Turn "{currentTopic}" into a multi-scene animated whiteboard video with AI voice narration.
                </p>
                <button
                  type="button"
                  onClick={() => void handleGenerateVideo()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Generate Video Explainer</span>
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "references" && (
          <div className="space-y-2.5">
            {latestCitations.length > 0 ? (
              latestCitations.map((c, idx) => (
                <div
                  key={`${c.document_id}-${idx}`}
                  className="rounded-xl border border-slate-800 bg-navy-950/80 p-3 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-teal-300">
                      {c.document_name} — Page {c.page_number}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      relevance {c.score}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{c.snippet}...</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 bg-navy-950/60 p-4 text-xs text-slate-400">
                No citations matched the latest prompt yet.
              </div>
            )}

            {documents.length > 0 && (
              <div className="pt-1">
                <div className="mb-1.5 text-[11px] font-medium text-slate-400">
                  Attached Study PDFs
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {documents.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-950 px-2.5 py-1 text-[11px] text-slate-300"
                    >
                      <FileText className="h-3 w-3 text-accent-blue" />
                      {d.file_name} ({d.page_count}p)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "intel" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-accent-teal" />
                Evidence-based mastery estimates (updated from evaluated responses)
              </span>
            </div>
            {masteryRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-navy-950/60 p-4 text-xs text-slate-400">
                Answer a follow-up or quiz question to generate live mastery estimates.
              </div>
            ) : (
              <div className="space-y-2">
                {masteryRecords.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-800 bg-navy-950/80 p-2.5"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{m.concept}</span>
                      <span
                        className={`font-mono text-[11px] ${
                          m.mastery_score >= 70
                            ? "text-emerald-400"
                            : m.mastery_score >= 50
                            ? "text-amber-300"
                            : "text-rose-400"
                        }`}
                      >
                        ~{Math.round(m.mastery_score)}% est. ({m.correct_attempts}/{m.attempts})
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          m.mastery_score >= 70
                            ? "bg-emerald-500"
                            : m.mastery_score >= 50
                            ? "bg-amber-400"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, m.mastery_score))}%` }}
                      />
                    </div>
                    {m.last_misconception && (
                      <p className="mt-1 text-[11px] text-amber-300/90">
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
