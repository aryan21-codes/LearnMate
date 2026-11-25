import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { TutorMessage, TutorMode } from "../../types";
import { useAudioInputManager } from "../../hooks/useAudioInputManager";

interface TutorChatPanelProps {
  messages: TutorMessage[];
  tutorMode: TutorMode;
  loading: boolean;
  activeFollowup: {
    question: string;
    concept?: string;
    strategy?: string;
  } | null;
  onChangeMode: (mode: TutorMode) => void;
  onAskQuestion: (text: string) => Promise<void>;
  onEvaluateAnswer: (answer: string) => Promise<void>;
  onRequestQuiz: () => Promise<void>;
}

const MODES: Array<{ id: TutorMode; label: string }> = [
  { id: "explain", label: "Explain" },
  { id: "socratic", label: "Socratic" },
  { id: "quiz", label: "Quiz" },
  { id: "exam_prep", label: "Exam Prep" },
  { id: "revision", label: "Revision" },
];

export const TutorChatPanel: React.FC<TutorChatPanelProps> = ({
  messages,
  tutorMode,
  loading,
  activeFollowup,
  onChangeMode,
  onAskQuestion,
  onEvaluateAnswer,
  onRequestQuiz,
}) => {
  const [input, setInput] = useState("");
  const [replyAsEvaluation, setReplyAsEvaluation] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const audio = useAudioInputManager();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submitText = async (textToSubmit: string) => {
    const clean = textToSubmit.trim();
    if (!clean || loading) return;
    setInput("");
    if (activeFollowup && replyAsEvaluation) {
      await onEvaluateAnswer(clean);
    } else {
      await onAskQuestion(clean);
    }
  };

  const handleVoiceToggle = async () => {
    if (audio.recordingState === "idle") {
      await audio.startPushToTalk((transcript) => {
        if (transcript.trim()) {
          void submitText(transcript);
        }
      });
    } else {
      await audio.stopPushToTalk((transcript) => {
        if (transcript.trim()) {
          void submitText(transcript);
        }
      });
    }
  };

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header + Tutor Mode Tabs */}
      <div className="border-b border-slate-200/90 bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">LearnMate AI Tutor</h2>
              <p className="text-[11px] text-slate-500 font-medium">Adaptive conversational coaching</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void onRequestQuiz()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700 shadow-sm disabled:opacity-50 transition"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Quick Quiz
            </button>
            <button
              type="button"
              onClick={() => audio.setTtsEnabled(!audio.ttsEnabled)}
              title={audio.ttsEnabled ? "Mute AI voice" : "Enable AI voice"}
              className={`rounded-xl border p-1.5 transition shadow-sm ${
                audio.ttsEnabled
                  ? "border-teal-300 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-400 hover:text-slate-600"
              }`}
            >
              {audio.ttsEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChangeMode(m.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                tutorMode === m.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transcript / Messages */}
      <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-teal-600" />
            <p className="font-display text-sm font-bold text-slate-900">
              Ask your first question by voice or text
            </p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              LearnMate indexes your study PDFs, checks your understanding with adaptive questions,
              and generates smart diagrams and video explanations automatically.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isStudent = msg.role === "student";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isStudent ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  isStudent
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "border border-slate-200 bg-slate-50/80 text-slate-900 rounded-bl-sm"
                }`}
              >
                {/* Badges for adaptive teaching state */}
                {!isStudent && (msg.concept || msg.teaching_strategy || msg.understanding_level) && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {msg.concept && (
                      <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {msg.concept}
                      </span>
                    )}
                    {msg.teaching_strategy && (
                      <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                        Strategy: {msg.teaching_strategy.replace(/_/g, " ")}
                      </span>
                    )}
                    {msg.understanding_level === "strong" && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Strong Understanding
                      </span>
                    )}
                    {(msg.understanding_level === "partial" ||
                      msg.understanding_level === "misconception") && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <AlertTriangle className="h-3 w-3" />{" "}
                        {msg.understanding_level === "misconception"
                          ? "Misconception Detected"
                          : "Partial Understanding"}
                      </span>
                    )}
                  </div>
                )}

                {msg.misconception_identified && (
                  <div className="mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 font-medium">
                    <strong>Clarifying misconception:</strong> {msg.misconception_identified}
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.analogy && (
                  <div className="mt-2.5 rounded-xl border border-teal-200 bg-teal-50/80 p-3 text-xs text-teal-950 font-medium">
                    <span className="font-bold text-teal-800">Real-world analogy: </span>
                    {msg.analogy}
                  </div>
                )}

                {msg.example && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800">
                    <span className="font-bold text-blue-700">Example: </span>
                    <span className="whitespace-pre-wrap">{msg.example}</span>
                  </div>
                )}

                {msg.followup_question && (
                  <div className="mt-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-950 font-medium">
                    <span className="font-bold text-blue-800">Check understanding: </span>
                    {msg.followup_question}
                  </div>
                )}

                {msg.insufficient_document_context && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                    Note: Your uploaded study material did not fully cover this detail.
                  </div>
                )}

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.citations.map((c, idx) => (
                      <span
                        key={`${c.document_id}-${c.page_number}-${idx}`}
                        title={c.snippet}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                      >
                        <BookOpen className="h-2.5 w-2.5 text-teal-600" />
                        {c.document_name} (p.{c.page_number})
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1 px-1 font-mono text-[10px] text-slate-400">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            Thinking & retrieving study context...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Follow-up Answer Indicator + Input Area */}
      <div className="border-t border-slate-200/90 bg-white p-3 space-y-2">
        {activeFollowup && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-[11px] text-blue-900 font-medium">
            <span className="truncate">
              Replying to check: <em>{activeFollowup.question}</em>
            </span>
            <button
              type="button"
              onClick={() => setReplyAsEvaluation((v) => !v)}
              className="shrink-0 rounded-lg bg-white border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 shadow-sm"
            >
              {replyAsEvaluation ? "Evaluate Answer" : "Ask New Question"}
            </button>
          </div>
        )}

        {(audio.interimTranscript || audio.error) && (
          <div className="text-xs">
            {audio.interimTranscript && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-teal-900 font-medium">
                Listening: &ldquo;{audio.interimTranscript}&rdquo;
              </div>
            )}
            {audio.error && (
              <div className="mt-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-900">
                {audio.error}
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitText(input);
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => void handleVoiceToggle()}
            disabled={loading || audio.mode === "text_only"}
            title={
              audio.recordingState === "idle"
                ? "Push to Talk (Ask AI by voice)"
                : "Stop recording & send"
            }
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition shadow-sm ${
              audio.recordingState === "listening" || audio.recordingState === "recording"
                ? "animate-pulse bg-rose-600 text-white"
                : audio.recordingState === "transcribing"
                ? "bg-amber-600 text-white"
                : "border border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100"
            } disabled:opacity-40`}
          >
            {audio.recordingState === "idle" ? (
              <>
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </>
            ) : audio.recordingState === "transcribing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Transcribing</span>
              </>
            ) : (
              <>
                <MicOff className="h-4 w-4" />
                <span>Stop</span>
              </>
            )}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeFollowup && replyAsEvaluation
                ? "Answer the tutor's follow-up question..."
                : "Ask a question or explain what confused you..."
            }
            className="h-10 flex-1 rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition font-medium"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 shadow-sm transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
