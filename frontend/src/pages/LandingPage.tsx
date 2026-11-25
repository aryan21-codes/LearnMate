import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  FileText,
  GraduationCap,
  Layers,
  Mic,
  Video,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const LandingPage: React.FC = () => {
  const { supabaseAuthEnabled, signInWithEmail, signUpWithEmail, continueAsLocalStudent } =
    useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"local" | "signin" | "signup">("local");
  const [name, setName] = useState("Alex Chen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "local") {
        await continueAsLocalStudent(name, email || undefined);
      } else if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(name, email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12 sm:px-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-12">
        {/* Left Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-7 space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-300">
            <GraduationCap className="h-3.5 w-3.5" />
            LearnMate Live • Adaptive AI Study Tutor
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl leading-tight">
            Your personal AI tutor.{" "}
            <span className="bg-gradient-to-r from-accent-blue via-accent-teal to-accent-violet bg-clip-text text-transparent">
              One conversation away from understanding.
            </span>
          </h1>

          <p className="max-w-xl text-base text-slate-400 leading-relaxed">
            Study inside a live Zoom Video SDK classroom with an adaptive AI tutor that grounds
            explanations in your uploaded PDFs, draws concept diagrams, detects misconceptions, and
            switches teaching strategies until concepts click.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
            {[
              {
                icon: BrainCircuit,
                title: "Adaptive Teaching Loop",
                desc: "Detects misconceptions and switches strategies rather than repeating answers.",
              },
              {
                icon: Video,
                title: "Zoom Video SDK Room",
                desc: "Server-signed session tokens with isolated mic contention safeguards.",
              },
              {
                icon: FileText,
                title: "PDF-Grounded RAG",
                desc: "Extracts page-cited study notes so explanations stay faithful to your material.",
              },
              {
                icon: Layers,
                title: "Smart Whiteboard",
                desc: "Generates sanitized Mermaid flowcharts, traces, and concept maps live.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-800/90 bg-navy-900/60 p-3.5"
              >
                <item.icon className="mb-2 h-4 w-4 text-accent-teal" />
                <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                <div className="mt-1 text-xs text-slate-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mt-10 lg:col-span-5 lg:mt-0"
        >
          <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Start Studying</h2>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Mic className="h-3.5 w-3.5 text-accent-blue" />
                Voice & Text Ready
              </span>
            </div>

            {supabaseAuthEnabled && (
              <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl bg-navy-950 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("local")}
                  className={`rounded-lg py-1.5 font-medium transition ${
                    mode === "local" ? "bg-slate-800 text-white" : "text-slate-400"
                  }`}
                >
                  Quick Start
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-lg py-1.5 font-medium transition ${
                    mode === "signin" ? "bg-slate-800 text-white" : "text-slate-400"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-lg py-1.5 font-medium transition ${
                    mode === "signup" ? "bg-slate-800 text-white" : "text-slate-400"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {(mode === "local" || mode === "signup") && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Student Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Alex Chen"
                    className="w-full rounded-xl border border-slate-700/80 bg-navy-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-accent-blue focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Email {mode === "local" ? "(optional)" : ""}
                </label>
                <input
                  type="email"
                  required={mode !== "local"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full rounded-xl border border-slate-700/80 bg-navy-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-accent-blue focus:outline-none"
                />
              </div>

              {mode !== "local" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700/80 bg-navy-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-accent-blue focus:outline-none"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 disabled:opacity-50 transition"
              >
                {submitting
                  ? "Preparing workspace..."
                  : mode === "signin"
                  ? "Sign In & Open Dashboard"
                  : mode === "signup"
                  ? "Create Student Account"
                  : "Enter Learning Dashboard"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {!supabaseAuthEnabled && (
              <p className="mt-4 text-[11px] text-slate-500">
                Running in local workspace profile mode. Configure{" "}
                <code className="font-mono text-slate-400">VITE_SUPABASE_URL</code> &{" "}
                <code className="font-mono text-slate-400">VITE_SUPABASE_ANON_KEY</code> to enable
                Supabase email authentication.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
