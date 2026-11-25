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
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] [background-image:radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:28px_28px]">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-teal-100/50 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-teal-800">
                <Sparkles className="h-3 w-3 text-teal-600" />
                Student Workspace
              </span>
              <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Welcome back, {user.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                Launch an adaptive voice-enabled tutoring room or upload PDFs for grounded study
                coaching and real-time concept mastery.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-100 shadow-sm transition">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                ) : (
                  <Upload className="h-4 w-4 text-teal-600" />
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
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition"
              >
                <PlusCircle className="h-4 w-4" />
                Start AI Tutoring Session
              </Link>
            </div>
          </div>
        </section>

        {integrations && (!integrations.openai_configured || !integrations.zoom_configured) && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
            <strong>Configuration Notice:</strong>{" "}
            {!integrations.openai_configured && (
              <span>
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">OPENAI_API_KEY</code> is not set (AI tutor responses disabled).{" "}
              </span>
            )}
            {!integrations.zoom_configured && (
              <span>
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">ZOOM_SDK_KEY</code> /{" "}
                <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">ZOOM_SDK_SECRET</code> not set (Zoom Video room will show setup instructions).{" "}
              </span>
            )}
            Storage backend: <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">{integrations.storage_backend}</code>.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-900 shadow-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm font-medium text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
            Loading your learning intelligence...
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Study Sessions</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-900">
                  {progress?.stats.total_sessions ?? 0}
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  {progress?.stats.completed_sessions ?? 0} completed
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Avg Mastery</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-900">
                  {progress?.stats.total_attempts
                    ? `~${progress.stats.average_mastery_estimate}%`
                    : "—"}
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  {progress?.stats.total_correct ?? 0}/{progress?.stats.total_attempts ?? 0} checks passed
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Weak Concepts</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-900">
                  {progress?.weak_concepts.length ?? 0}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Flagged from evaluated answers
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Study PDFs</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-900">
                  {documents.length}
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  Indexed for RAG citations
                </div>
              </div>
            </section>

            {/* Main Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 cols: Progress + Recent Sessions */}
              <div className="space-y-6 lg:col-span-7">
                {/* Learning Progress */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <BrainCircuit className="h-4 w-4" />
                      </div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Topic Mastery Estimates
                      </h2>
                    </div>
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-500">
                      Based on check-in checks
                    </span>
                  </div>

                  {!progress || progress.mastery_records.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-600">
                      No evaluated answers yet. Start a session and answer the tutor&apos;s
                      check-in questions to build real mastery tracking.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {progress.mastery_records.slice(0, 6).map((m) => (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 hover:bg-slate-50 transition"
                        >
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900">{m.concept}</span>
                              <span className="ml-2 text-slate-500">({m.topic})</span>
                            </div>
                            <span className="font-mono font-bold text-slate-700">
                              ~{Math.round(m.mastery_score)}% est.
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                m.mastery_score >= 70
                                  ? "bg-emerald-500"
                                  : m.mastery_score >= 50
                                  ? "bg-amber-500"
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
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Recent Tutoring Sessions
                    </h2>
                    <Link
                      to="/setup"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      + Start New
                    </Link>
                  </div>

                  {!progress || progress.recent_sessions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-600">
                      You haven&apos;t started any tutoring sessions yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {progress.recent_sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 hover:border-slate-300 transition"
                        >
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {s.topic}{" "}
                              <span className="text-xs font-normal text-slate-500">
                                • {s.subject}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 font-medium">
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
                              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition"
                            >
                              {s.ended_at ? "Reopen Room" : "Resume"}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/summary/${s.id}`)}
                              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition"
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
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Focus Areas & Recommendations
                    </h2>
                  </div>

                  {!progress || progress.recommended_topics.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Weak concepts and personalized topic recommendations appear automatically as
                      you practice with the AI tutor.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {progress.recommended_topics.map((rec, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900">
                              {rec.concept}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/setup?topic=${encodeURIComponent(rec.concept || rec.topic)}`
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                            >
                              Practice <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-amber-800/90">{rec.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Uploaded Study Materials */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <FileText className="h-4 w-4" />
                      </div>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Study Materials (PDF)
                      </h2>
                    </div>
                    <span className="font-mono text-[10px] font-bold uppercase text-slate-500">
                      {documents.length} file(s)
                    </span>
                  </div>

                  {documents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center text-xs text-slate-600">
                      Upload lecture slides or textbook chapters (PDF) so the AI tutor cites exact
                      page numbers.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-xs hover:bg-slate-50 transition"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate font-semibold text-slate-900">
                              {d.file_name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {d.page_count} pages • {d.chunk_count} indexed chunks
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                              d.processing_status === "ready"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : d.processing_status === "failed"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
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
