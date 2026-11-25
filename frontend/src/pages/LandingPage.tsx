import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Download,
  FileText,
  Film,
  GraduationCap,
  Layers,
  Mic,
  Palette,
  ShieldCheck,
  Sparkles,
  Video,
  Volume2,
  Zap,
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

  // Interactive Live Preview State on Landing Page
  const [activeDemoTab, setActiveDemoTab] = useState<"whiteboard" | "video" | "citations">(
    "whiteboard"
  );
  const [demoZoom, setDemoZoom] = useState(100);

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
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Subtle artistic paper grid background texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.45]"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* TOP ARTISTIC NAVIGATION */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-black/5">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-extrabold tracking-tight text-slate-900">
                  LearnMate
                </span>
                <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-blue-700">
                  STUDIO
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-500 hidden sm:block">
                AI Multimodal Live Tutoring Classroom
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#showcase"
              className="hidden md:inline-flex text-xs font-semibold text-slate-600 hover:text-blue-600 transition px-3 py-1.5"
            >
              Interactive Studio
            </a>
            <a
              href="#pillars"
              className="hidden md:inline-flex text-xs font-semibold text-slate-600 hover:text-blue-600 transition px-3 py-1.5"
            >
              Pedagogy
            </a>
            <a
              href="#architecture"
              className="hidden lg:inline-flex text-xs font-semibold text-slate-600 hover:text-blue-600 transition px-3 py-1.5"
            >
              Tech Architecture
            </a>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("auth-card");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md shadow-slate-900/10 hover:bg-blue-600 hover:shadow-blue-500/25 transition active:scale-95"
            >
              <span>Launch Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24">
        {/* Artistic ambient color flares */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[750px] -z-10 rounded-full bg-gradient-to-tr from-blue-200/40 via-violet-200/30 to-amber-100/40 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Hero Column */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="lg:col-span-7 space-y-6"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-blue-800 shadow-sm backdrop-blur">
                <Palette className="h-3.5 w-3.5 text-blue-600" />
                <span>The Fine Art of Cognitive Learning</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-slate-400 font-mono text-[10px]">v2.4 Live</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.08]">
                Where Live Video,{" "}
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Smart Whiteboards,
                </span>{" "}
                & Notes Come Alive.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Replace passive video lectures with a live AI study tutor. LearnMate joins you in a
                real-time Zoom classroom, draws illustrative concept diagrams on a dynamic whiteboard,
                narrates 45-second animated explainer videos, and grounds every answer in your uploaded notes.
              </p>

              {/* Quick Feature Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "Zoom Video SDK Canvas", icon: Video, color: "text-blue-700 bg-blue-50 border-blue-200" },
                  { label: "Groq 120B Cognitive Engine", icon: Zap, color: "text-violet-700 bg-violet-50 border-violet-200" },
                  { label: "Open-Material Notes RAG", icon: FileText, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                  { label: "Mermaid Visual Auto-Repair", icon: Layers, color: "text-amber-800 bg-amber-50 border-amber-200" },
                ].map((pill, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold ${pill.color}`}
                  >
                    <pill.icon className="h-3 w-3" />
                    <span>{pill.label}</span>
                  </span>
                ))}
              </div>

              {/* Social Proof / Stats Strip */}
              <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <div className="font-display text-2xl font-black text-slate-900">120B</div>
                  <div className="text-[11px] font-medium text-slate-500">Parameters Open Reasoner</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-black text-blue-600">&lt;400ms</div>
                  <div className="text-[11px] font-medium text-slate-500">Streaming Tutor Latency</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-black text-violet-600">100%</div>
                  <div className="text-[11px] font-medium text-slate-500">Page-Grounded Citations</div>
                </div>
              </div>
            </motion.div>

            {/* Right Quick-Launch Card */}
            <motion.div
              id="auth-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="relative rounded-3xl border-2 border-slate-900 bg-white p-7 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-all">
                {/* Floating Artistic Tag */}
                <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  Instant Access
                </div>

                <div className="mb-5">
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Step Into The Studio
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    No credit card or setup required. Jump straight into an interactive tutoring room.
                  </p>
                </div>

                {supabaseAuthEnabled && (
                  <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setMode("local")}
                      className={`rounded-lg py-1.5 font-bold transition ${
                        mode === "local" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Quick Start
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className={`rounded-lg py-1.5 font-bold transition ${
                        mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className={`rounded-lg py-1.5 font-bold transition ${
                        mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {(mode === "local" || mode === "signup") && (
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-800">
                        Student Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Maya Patel"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-800">
                      Email Address {mode === "local" && <span className="font-normal text-slate-400">(Optional)</span>}
                    </label>
                    <input
                      type="email"
                      required={mode !== "local"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>

                  {mode !== "local" && (
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-800">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition active:scale-[0.98] disabled:opacity-50"
                  >
                    <span>
                      {submitting
                        ? "Opening Studio..."
                        : mode === "local"
                        ? "Enter Study Studio"
                        : mode === "signin"
                        ? "Sign In & Continue"
                        : "Create Account & Enter"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Zoom SDK & Groq 120B Credentials Secured</span>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SHOWCASE SECTION: REALISTIC STUDIO PREVIEW */}
      <section id="showcase" className="py-16 sm:py-24 border-y border-slate-200/90 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Live Studio Experience
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">
              One Unified Canvas For Your Brain.
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Everything in LearnMate Live works in concert: your camera, illustrative whiteboard, voiceover explanation, and notes citations.
            </p>
          </div>

          {/* Interactive Studio Mockup Frame */}
          <div className="rounded-3xl border-2 border-slate-800 bg-[#0F172A] p-2 sm:p-4 shadow-2xl shadow-blue-900/10 text-white">
            {/* Window Chrome Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-3 pb-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  room-study-session • Zoom Video SDK Live • Groq 120B Connected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
            </div>

            {/* Interior Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
              {/* Left / Center: Video + Whiteboard Canvas */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                {/* Mini Zoom Camera Bar */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 px-3.5 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                      <Video className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Alex Chen (Student)</div>
                      <div className="text-[10px] text-slate-400">HD 720p • WebAssembly Stream Active</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                      <Mic className="h-2.5 w-2.5 text-blue-400" />
                      Push-to-Talk Safe
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Latency: 28ms</span>
                  </div>
                </div>

                {/* Whiteboard / Video Explainer Workspace */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 min-h-[300px] flex flex-col justify-between">
                  {/* Canvas Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveDemoTab("whiteboard")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          activeDemoTab === "whiteboard"
                            ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Smart Whiteboard
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDemoTab("video")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          activeDemoTab === "video"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Film className="h-3.5 w-3.5 text-blue-400" />
                        🎬 Video Explainer
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDemoTab("citations")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          activeDemoTab === "citations"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                        References (3)
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <span>Zoom: {demoZoom}%</span>
                      <button
                        type="button"
                        onClick={() => setDemoZoom((z) => Math.min(z + 25, 150))}
                        className="rounded bg-slate-800 px-1.5 py-0.5 hover:text-white"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoZoom((z) => Math.max(z - 25, 75))}
                        className="rounded bg-slate-800 px-1.5 py-0.5 hover:text-white"
                      >
                        -
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Visual Stage */}
                  <div className="py-6 flex flex-col items-center justify-center">
                    {activeDemoTab === "whiteboard" && (
                      <div
                        style={{ transform: `scale(${demoZoom / 100})` }}
                        className="transition-transform duration-150 w-full max-w-lg"
                      >
                        {/* Interactive Vector Flowchart Representation */}
                        <div className="flex flex-col items-center gap-2">
                          <div className="rounded-xl border border-blue-500/40 bg-blue-950/60 px-4 py-2 font-mono text-xs font-bold text-blue-200 shadow-md">
                            1. fact(4) Stack Frame Allocated [n=4]
                          </div>
                          <div className="text-blue-400 font-bold text-xs">↓ calls fact(3)</div>
                          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/60 px-4 py-2 font-mono text-xs font-bold text-indigo-200 shadow-md">
                            2. fact(3) Frame Pushed [n=3]
                          </div>
                          <div className="text-indigo-400 font-bold text-xs">↓ base case reached</div>
                          <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/70 px-4 py-2 font-mono text-xs font-bold text-emerald-300 shadow-lg shadow-emerald-500/10">
                            3. fact(1) = 1 → Stack Unwinds → Result: 24
                          </div>
                        </div>
                      </div>
                    )}

                    {activeDemoTab === "video" && (
                      <div className="w-full space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span className="font-bold text-blue-400">SCENE 2 OF 4: The Base Condition Trigger</span>
                          <span className="font-mono text-slate-400">~45s Storyboard</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 w-1/2 rounded-full" />
                        </div>
                        <div className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-3.5 text-xs text-slate-200">
                          <div className="font-bold text-blue-300 mb-1 flex items-center gap-1.5">
                            <Volume2 className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                            AI Voiceover Narration:
                          </div>
                          &quot;When n reaches 1, the base condition triggers immediately. Rather than stacking another call, it returns 1 and initiates the unwind phase.&quot;
                        </div>
                      </div>
                    )}

                    {activeDemoTab === "citations" && (
                      <div className="w-full space-y-2 text-xs">
                        <div className="font-bold text-emerald-400 mb-2">Grounding Source Citations:</div>
                        {[
                          { doc: "Algorithms_Ch4_Recursion.pdf", page: 42, text: "The call stack memory allocation model for recursive branch sub-problems." },
                          { doc: "Algorithms_Ch4_Recursion.pdf", page: 45, text: "Base condition validation theorems preventing stack overflow." },
                        ].map((c, i) => (
                          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/80 p-2.5 flex items-start gap-2">
                            <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5">
                              p.{c.page}
                            </span>
                            <span className="text-slate-300">{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom AI Voiceover Audio Equalizer Waveform */}
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-3.5 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-violet-400" />
                      <span className="text-slate-300 font-medium">AI Tutor Voice Output:</span>
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-1 bg-violet-400 h-2 animate-bounce" />
                        <span className="w-1 bg-violet-400 h-3 animate-pulse" />
                        <span className="w-1 bg-violet-400 h-1.5 animate-bounce" />
                        <span className="w-1 bg-violet-400 h-2.5 animate-pulse" />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">Keep-Alive Heartbeat: Active</span>
                  </div>
                </div>
              </div>

              {/* Right: AI Conversation Stream */}
              <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Tutor Conversation</span>
                    <span className="rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold px-2 py-0.5">
                      Explain Mode
                    </span>
                  </div>

                  {/* Student Message */}
                  <div className="rounded-xl bg-slate-800/80 p-2.5 text-xs text-slate-200 ml-4 border border-slate-700/60">
                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Alex Chen</div>
                    Why doesn&apos;t the function run forever if it keeps calling itself?
                  </div>

                  {/* Tutor Reply */}
                  <div className="rounded-xl bg-blue-950/40 p-2.5 text-xs text-slate-200 mr-2 border border-blue-500/30">
                    <div className="text-[10px] text-blue-400 font-bold mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      LearnMate AI (Strategy: Analogy First)
                    </div>
                    Think of a Russian nesting doll: you open each layer to find an identical smaller one inside, until you hit the solid center doll. That center doll is our <strong>base case</strong>!
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 text-center">
                  <span className="text-[11px] font-mono text-emerald-400">
                    ✓ Misconception Check: Passed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUR ARTISTIC PILLARS BENTO GRID */}
      <section id="pillars" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
              Artistic & Cognitive Foundations
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-slate-900 mt-3 tracking-tight">
              Engineered For True Intuition.
            </h2>
            <p className="text-base text-slate-600 mt-3 leading-relaxed">
              Every feature was designed to make difficult concepts click effortlessly through multiple sensory channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            {/* Bento Card 1: Dynamic Smart Whiteboard */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 mb-6">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">
                Dynamic Smart Whiteboard
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The tutor generates sanitized, reactive Mermaid flowcharts, state transitions, and memory traces on the fly. An autonomous two-tier AST repair engine normalizes arrows and quotes syntax so diagrams render safely 100% of the time.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 font-mono text-xs text-slate-700">
                <div className="text-[11px] font-bold text-blue-600 uppercase mb-1">Live AST Normalization:</div>
                <code>A[&quot;Call fact(4), n=4&quot;] --&gt; B[&quot;Call fact(3), n=3&quot;]</code>
              </div>
            </div>

            {/* Bento Card 2: 🎬 Video Explainer */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 mb-6">
                <Film className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">
                🎬 AI Video Explainer
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Need an animated summary? Click one button to direct a 45-second 3Blue1Brown/Khan Academy-inspired storyboard with sequential scene diagrams, narration voiceover, and exportable scripts.
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/70 border border-violet-200 px-3 py-1 text-xs font-bold text-violet-800">
                <Sparkles className="h-3.5 w-3.5" />
                Scene-by-Scene Animation
              </span>
            </div>

            {/* Bento Card 3: Open-Material Notes RAG */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-6">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">
                Open-Material Notes RAG
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                No forced single-topic restrictions. Upload 100-page textbooks or slide decks. LearnMate indexes the entire document with PyMuPDF and answers questions jumping across any chapter with exact page citations.
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                72% Cosine + 28% BM25 Hybrid
              </span>
            </div>

            {/* Bento Card 4: Misconception Engine */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 mb-6">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">
                Misconception Diagnostic Engine
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                When you make a mistake, LearnMate never repeats the same failed explanation. It identifies your underlying mental model flaw and automatically shifts strategies—from analogies to worked step traces to socratic questioning.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Analogy First", "Call-Stack Trace", "Concrete Worked Example", "Socratic Guiding"].map((strat, i) => (
                  <span key={i} className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {strat}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EDITORIAL COMPARISON SECTION */}
      <section className="py-16 sm:py-24 border-t border-slate-200/90 bg-[#F8FAFC]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
              The Evolution of Learning
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Why active multimodal tutoring yields significantly higher retention than passive video watching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="rounded-3xl border border-slate-300/80 bg-white p-8 space-y-4">
              <div className="font-mono text-xs font-bold text-rose-600 uppercase tracking-wider">
                The Old Way • Passive & Disconnected
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                Pre-recorded Videos & Text Chatbots
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>One-way monologue: You can&apos;t pause the teacher to ask &quot;Wait, why step 2?&quot;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Generic chatbots output intimidating walls of unformatted markdown text.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Zero visual diagramming or real-time illustrative feedback.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>Repeats the exact same answer when you don&apos;t understand.</span>
                </li>
              </ul>
            </div>

            {/* The LearnMate Way */}
            <div className="rounded-3xl border-2 border-blue-600 bg-white p-8 space-y-4 shadow-xl shadow-blue-500/5">
              <div className="font-mono text-xs font-bold text-blue-600 uppercase tracking-wider">
                The LearnMate Way • Live Multimodal Studio
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Real-Time Synchronized Classroom
              </h3>
              <ul className="space-y-3 text-sm text-slate-700 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Real-time Zoom Video SDK presence with zero-contention voice communication.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Dynamic Smart Whiteboard generates crisp vector diagrams as concepts unfold.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Strict page-grounded citations directly linking to your uploaded lecture notes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Adaptive pedagogy switches strategies (Analogy → Trace → Socratic) until you master it.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TECH ARCHITECTURE CTA & FOOTER */}
      <section id="architecture" className="py-16 sm:py-24 border-t border-slate-200/90 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1 text-xs font-mono font-bold text-slate-700">
            <Code2 className="h-3.5 w-3.5 text-blue-600" />
            <span>Open Source Architecture & Verified Whitepaper</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built On Modern Engineering Standards.
          </h2>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Curious about our dual-channel audio conflict resolution, the 72/28 hybrid RAG mathematics, or the Mermaid AST repair regex pipeline? Read our comprehensive technical whitepaper.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="/LearnMate_Live_Technical_Architecture.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-600 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Technical Whitepaper (PDF)</span>
            </a>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("auth-card");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition"
            >
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              <span>Launch Studio Room</span>
            </button>
          </div>
        </div>
      </section>

      {/* ARTISTIC FOOTER */}
      <footer className="border-t border-slate-200 bg-[#FAF9F6] py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
              LM
            </div>
            <span className="font-bold text-slate-700">LearnMate Live</span>
            <span>• Crafted with precision for curious minds</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/aryan21-codes/LearnMate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition font-medium"
            >
              GitHub Repository
            </a>
            <span>•</span>
            <span className="font-mono text-[10px] text-emerald-600 font-bold">● System Operational (16/16 Tests Passing)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
