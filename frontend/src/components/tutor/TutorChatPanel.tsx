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
    <div className="flex h-full flex-col rounded-2xl border border-slate-800/90 bg-navy-900/70">
      {/* Header + Tutor Mode Tabs */}
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">LearnMate AI Tutor</h2>
              <p className="text-[11px] text-slate-400">Adaptive conversational coaching</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void onRequestQuiz()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/15 px-2.5 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-500/25 disabled:opacity-50"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Quick Quiz
            </button>
            <button
              type="button"
              onClick={() => audio.setTtsEnabled(!audio.ttsEnabled)}
              title={audio.ttsEnabled ? "Mute AI voice" : "Enable AI voice"}
              className={`rounded-lg border p-1.5 transition ${
                audio.ttsEnabled
                  ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                  : "border-slate-700 bg-navy-850 text-slate-500"
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
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                tutorMode === m.id
                  ? "bg-accent-blue text-white shadow-sm"
                  : "bg-navy-850 text-slate-400 hover:text-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transcript / Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-navy-950/50 p-5 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-accent-teal" />
            <p className="text-sm font-medium text-slate-200">
              Ask your first question by voice or text
            </p>
            <p className="mt-1 text-xs text-slate-400">
              LearnMate uses your uploaded PDFs, checks your understanding with follow-up questions,
              and adapts its teaching strategy if anything feels unclear.
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
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isStudent
                    ? "bg-accent-blue text-white rounded-br-sm"
                    : "border border-slate-800 bg-navy-850/90 text-slate-100 rounded-bl-sm"
                }`}
              >
                {/* Badges for adaptive teaching state */}
                {!isStudent && (msg.concept || msg.teaching_strategy || msg.understanding_level) && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {msg.concept && (
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        {msg.concept}
                      </span>
                    )}
                    {msg.teaching_strategy && (
                      <span className="rounded-md bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                        Strategy: {msg.teaching_strategy.replace(/_/g, " ")}
                      </span>
                    )}
                    {msg.understanding_level === "strong" && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" /> Strong Understanding
                      </span>
                    )}
                    {(msg.understanding_level === "partial" ||
                      msg.understanding_level === "misconception") && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                        <AlertTriangle className="h-3 w-3" />{" "}
                        {msg.understanding_level === "misconception"
                          ? "Misconception Detected"
                          : "Partial Understanding"}
                      </span>
                    )}
                  </div>
                )}

                {msg.misconception_identified && (
                  <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200">
                    <strong>Clarifying misconception:</strong> {msg.misconception_identified}
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.analogy && (
                  <div className="mt-2.5 rounded-lg border border-teal-500/25 bg-teal-500/10 p-2.5 text-xs text-teal-100">
                    <span className="font-semibold text-teal-300">Real-world analogy: </span>
                    {msg.analogy}
                  </div>
                )}

                {msg.example && (
                  <div className="mt-2 rounded-lg border border-slate-700/70 bg-navy-950/70 p-2.5 text-xs text-slate-200">
                    <span className="font-semibold text-blue-300">Example: </span>
                    <span className="whitespace-pre-wrap">{msg.example}</span>
                  </div>
                )}

                {msg.followup_question && (
                  <div className="mt-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-100">
                    <span className="font-semibold text-blue-300">Check understanding: </span>
                    {msg.followup_question}
                  </div>
                )}

                {msg.insufficient_document_context && (
                  <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                    Note: Your uploaded study material did not fully cover this detail.
                  </div>
                )}

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.citations.map((c, idx) => (
                      <span
                        key={`${c.document_id}-${c.page_number}-${idx}`}
                        title={c.snippet}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-navy-950 px-2 py-0.5 text-[10px] text-slate-300"
                      >
                        <BookOpen className="h-2.5 w-2.5 text-accent-teal" />
                        {c.document_name} (p.{c.page_number})
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1 px-1 text-[10px] text-slate-500">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-850/70 px-3.5 py-2.5 text-xs text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-accent-teal" />
            Thinking & retrieving study context...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Follow-up Answer Indicator + Input Area */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {activeFollowup && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[11px] text-blue-200">
            <span className="truncate">
              Replying to check: <em>{activeFollowup.question}</em>
            </span>
            <button
              type="button"
              onClick={() => setReplyAsEvaluation((v) => !v)}
              className="shrink-0 rounded bg-navy-900 px-2 py-0.5 text-[10px] font-medium text-blue-300 hover:bg-slate-800"
            >
              {replyAsEvaluation ? "Evaluate Answer" : "Ask New Question"}
            </button>
          </div>
        )}

        {(audio.interimTranscript || audio.error) && (
          <div className="text-xs">
            {audio.interimTranscript && (
              <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1.5 text-teal-200">
                Listening: "{audio.interimTranscript}"
              </div>
            )}
            {audio.error && (
              <div className="mt-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-rose-200">
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
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
              audio.recordingState === "listening" || audio.recordingState === "recording"
                ? "animate-pulse bg-rose-600 text-white"
                : audio.recordingState === "transcribing"
                ? "bg-amber-600 text-white"
                : "border border-teal-500/40 bg-teal-500/15 text-teal-200 hover:bg-teal-500/25"
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
            className="h-10 flex-1 rounded-xl border border-slate-700/80 bg-navy-950 px-3 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue focus:outline-none"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-blue text-white hover:bg-blue-500 disabled:opacity-40 transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
