import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Clock,
  FileText,
  Loader2,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { Navbar } from "../components/common/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type { ProgressResponse, StudyDocument } from "../types";

export const DashboardPage: React.FC = () => {
  const { user, integrations } = useAuth();
  const navigate = useNavigate();

  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [prog, docs] = await Promise.all([
        api.getProgress(user.id),
        api.listDocuments(user.id),
      ]);
      setProgress(prog);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadDocument(user.id, file);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Welcome Banner */}
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/90 bg-gradient-to-br from-navy-900 via-navy-900 to-navy-850 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-accent-teal">
              Student Workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Launch an adaptive voice-enabled tutoring room or upload PDFs for grounded study
              coaching.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-xs font-medium text-slate-200 hover:border-accent-teal/50 transition">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent-teal" />
              ) : (
                <Upload className="h-4 w-4 text-accent-teal" />
              )}
              {uploading ? "Processing PDF..." : "Upload Study PDF"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={uploading}
                onChange={handleFileUpload}
              />
            </label>

            <Link
              to="/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 transition"
            >
              <PlusCircle className="h-4 w-4" />
              Start AI Tutoring Session
            </Link>
          </div>
        </section>

        {integrations && (!integrations.openai_configured || !integrations.zoom_configured) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <strong>Configuration Notice:</strong>{" "}
            {!integrations.openai_configured && (
              <span>
                <code className="font-mono">OPENAI_API_KEY</code> is not set (AI tutor responses
                disabled).{" "}
              </span>
            )}
            {!integrations.zoom_configured && (
              <span>
                <code className="font-mono">ZOOM_SDK_KEY</code> /{" "}
                <code className="font-mono">ZOOM_SDK_SECRET</code> not set (Zoom Video room will
                show setup instructions).{" "}
              </span>
            )}
            Storage backend: <code className="font-mono">{integrations.storage_backend}</code>.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-accent-blue" />
            Loading your learning intelligence...
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-navy-900/70 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Study Sessions</span>
                  <Clock className="h-4 w-4 text-accent-blue" />
                </div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {progress?.stats.total_sessions ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {progress?.stats.completed_sessions ?? 0} completed
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-navy-900/70 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Avg Mastery (Est.)</span>
                  <TrendingUp className="h-4 w-4 text-accent-teal" />
                </div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {progress?.stats.total_attempts
                    ? `~${progress.stats.average_mastery_estimate}%`
                    : "—"}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {progress?.stats.total_correct ?? 0}/{progress?.stats.total_attempts ?? 0} checks
                  passed
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-navy-900/70 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Weak Concepts</span>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {progress?.weak_concepts.length ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Flagged from evaluated answers
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-navy-900/70 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Study PDFs</span>
                  <BookOpen className="h-4 w-4 text-accent-violet" />
                </div>
                <div className="mt-2 text-2xl font-bold text-white">{documents.length}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Indexed for RAG citations
                </div>
              </div>
            </section>

            {/* Main Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 cols: Progress + Recent Sessions */}
              <div className="space-y-6 lg:col-span-7">
                {/* Learning Progress */}
                <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-accent-teal" />
                      <h2 className="text-sm font-semibold text-white">
                        Topic Mastery Estimates
                      </h2>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Derived from actual evaluation attempts
                    </span>
                  </div>

                  {!progress || progress.mastery_records.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-navy-950/60 p-5 text-xs text-slate-400">
                      No evaluated answers yet. Start a session and answer the tutor&apos;s
                      check-in questions to build real mastery tracking.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {progress.mastery_records.slice(0, 6).map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-slate-800/80 bg-navy-950/70 p-3"
                        >
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-slate-100">{m.concept}</span>
                              <span className="ml-2 text-slate-500">({m.topic})</span>
                            </div>
                            <span className="font-mono text-slate-300">
                              ~{Math.round(m.mastery_score)}% est.
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                m.mastery_score >= 70
                                  ? "bg-emerald-500"
                                  : m.mastery_score >= 50
                                  ? "bg-amber-400"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(4, m.mastery_score))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Recent Sessions */}
                <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Recent Tutoring Sessions</h2>
                    <Link
                      to="/setup"
                      className="text-xs font-medium text-accent-blue hover:underline"
                    >
                      + Start New
                    </Link>
                  </div>

                  {!progress || progress.recent_sessions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-navy-950/60 p-5 text-xs text-slate-400">
                      You haven&apos;t started any tutoring sessions yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {progress.recent_sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-navy-950/70 p-3.5"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-100">
                              {s.topic}{" "}
                              <span className="text-xs font-normal text-slate-400">
                                • {s.subject}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                              <span className="capitalize">{s.learning_level}</span>
                              <span>•</span>
                              <span className="capitalize">{s.tutor_mode.replace("_", " ")}</span>
                              <span>•</span>
                              <span>{new Date(s.started_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/room/${s.id}`)}
                              className="rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-accent-blue/60"
                            >
                              {s.ended_at ? "Reopen Room" : "Resume"}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/summary/${s.id}`)}
                              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-slate-700"
                            >
                              Summary
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Right 5 cols: Weak Concepts + Recommended + Uploaded PDFs */}
              <div className="space-y-6 lg:col-span-5">
                {/* Weak Concepts & Recommendations */}
                <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent-violet" />
                    <h2 className="text-sm font-semibold text-white">
                      Weak Concepts & Recommended Topics
                    </h2>
                  </div>

                  {!progress || progress.recommended_topics.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Weak concepts and personalized topic recommendations appear automatically as
                      you practice with the AI tutor.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {progress.recommended_topics.map((rec, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-200">
                              {rec.concept}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/setup?topic=${encodeURIComponent(rec.concept || rec.topic)}`
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-teal hover:underline"
                            >
                              Practice <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-300">{rec.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Uploaded Study Materials */}
                <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent-blue" />
                      <h2 className="text-sm font-semibold text-white">
                        Uploaded Study Materials
                      </h2>
                    </div>
                    <span className="text-[11px] text-slate-500">{documents.length} file(s)</span>
                  </div>

                  {documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-navy-950/60 p-4 text-xs text-slate-400">
                      Upload lecture slides or textbook chapters (PDF) so the AI tutor cites exact
                      page numbers.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-navy-950/70 px-3 py-2.5 text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate font-medium text-slate-200">
                              {d.file_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {d.page_count} pages • {d.chunk_count} indexed chunks
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                              d.processing_status === "ready"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : d.processing_status === "failed"
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {d.processing_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
