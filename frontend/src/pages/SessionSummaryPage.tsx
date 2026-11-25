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
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-navy-900/70 py-16 text-center">
            <Loader2 className="mb-3 h-7 w-7 animate-spin text-accent-teal" />
            <p className="text-sm font-medium text-slate-200">
              Synthesizing personalized session insights...
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Reviewing transcript, misconceptions, and mastery progress.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
            <p className="font-semibold">Summary Generation Unavailable</p>
            <p className="mt-1 text-xs">{error}</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white"
            >
              Return to Dashboard
            </button>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Header */}
            <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-navy-900 to-navy-850 p-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-teal">
                <Sparkles className="h-3.5 w-3.5" />
                Session Complete
              </div>
              <h1 className="mt-1 text-2xl font-bold text-white">
                {summary.topic}{" "}
                <span className="text-base font-normal text-slate-400">• {summary.subject}</span>
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                {summary.demonstrated_understanding}
              </p>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Concepts Covered
                </h2>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {summary.topics_covered.map((t, i) => (
                    <li key={i} className="rounded-lg bg-navy-950/70 px-3 py-2">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Weak Concepts & Misconceptions
                </h2>
                {summary.weak_concepts.length === 0 && summary.misconceptions.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No major misconceptions flagged in this session.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-amber-200">
                    {summary.weak_concepts.map((w, i) => (
                      <li
                        key={`w-${i}`}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2"
                      >
                        Weak area: {w}
                      </li>
                    ))}
                    {summary.misconceptions.map((m, i) => (
                      <li
                        key={`m-${i}`}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-200"
                      >
                        Misconception: {m}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <BookOpen className="h-4 w-4 text-accent-blue" />
                  Important Takeaways
                </h2>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {summary.important_explanations.map((e, i) => (
                    <li key={i} className="rounded-lg bg-navy-950/70 px-3 py-2">
                      {e}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-navy-900/70 p-5">
                <h2 className="mb-3 text-sm font-semibold text-white">
                  Recommended Revision Plan
                </h2>
                <ul className="space-y-1.5 text-xs text-teal-200">
                  {summary.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-2"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-navy-900/70 p-5 sm:flex-row sm:items-center">
              <div>
                <div className="text-xs font-medium text-slate-400">Suggested Next Session</div>
                <div className="mt-0.5 text-sm font-semibold text-white">
                  {summary.suggested_next_session}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(`/setup?topic=${encodeURIComponent(summary.suggested_next_session)}`)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
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
