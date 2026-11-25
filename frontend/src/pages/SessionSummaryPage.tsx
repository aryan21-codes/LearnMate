import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Navbar } from "../components/common/Navbar";
import { api } from "../services/api";
import type { SessionSummary } from "../types";

export const SessionSummaryPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    (async () => {
      try {
        const res = await api.generateSummary(sessionId);
        if (active) setSummary(res);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Could not generate session summary.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] [background-image:radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:28px_28px]">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-teal-600" />
            <p className="font-display text-base font-bold text-slate-900">
              Synthesizing personalized session insights...
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Reviewing transcript, misconceptions, and mastery progress.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 text-sm shadow-sm">
            <p className="font-bold text-rose-700">Summary Generation Unavailable</p>
            <p className="mt-1 text-xs text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
            >
              Return to Dashboard
            </button>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Header */}
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-100/50 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                  Session Complete
                </div>
                <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  {summary.topic}{" "}
                  <span className="text-base font-normal text-slate-500">• {summary.subject}</span>
                </h1>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed max-w-3xl">
                  {summary.demonstrated_understanding}
                </p>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3.5 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  Concepts Covered
                </h2>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  {summary.topics_covered.map((t, i) => (
                    <li key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3.5 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  Weak Concepts & Misconceptions
                </h2>
                {summary.weak_concepts.length === 0 && summary.misconceptions.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No major misconceptions flagged in this session. Great retention!
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {summary.weak_concepts.map((w, i) => (
                      <li
                        key={`w-${i}`}
                        className="rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 font-medium text-amber-900"
                      >
                        Weak area: {w}
                      </li>
                    ))}
                    {summary.misconceptions.map((m, i) => (
                      <li
                        key={`m-${i}`}
                        className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 font-medium text-rose-900"
                      >
                        Misconception: {m}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3.5 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  Important Takeaways
                </h2>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  {summary.important_explanations.map((e, i) => (
                    <li key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                      {e}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3.5 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  Recommended Revision Plan
                </h2>
                <ul className="space-y-2 text-xs font-semibold text-teal-900">
                  {summary.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-teal-200 bg-teal-50/80 px-3.5 py-2.5"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Suggested Next Session</div>
                <div className="mt-1 font-display text-base font-bold text-slate-900">
                  {summary.suggested_next_session}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(`/setup?topic=${encodeURIComponent(summary.suggested_next_session)}`)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition"
              >
                Schedule Next Session
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
};
