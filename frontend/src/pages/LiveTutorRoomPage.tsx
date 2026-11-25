import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Loader2, Mic, PhoneOff, Radio } from "lucide-react";
import { Navbar } from "../components/common/Navbar";
import { AudioCompatModal } from "../components/tutor/AudioCompatModal";
import { LearningIntelPanel } from "../components/tutor/LearningIntelPanel";
import { TutorChatPanel } from "../components/tutor/TutorChatPanel";
import { VideoRoom } from "../components/zoom/VideoRoom";
import { ZoomSessionProvider, useZoomSession } from "../components/zoom/ZoomSessionProvider";
import { useAuth } from "../contexts/AuthContext";
import { useAudioInputManager } from "../hooks/useAudioInputManager";
import { api } from "../services/api";
import type {
  CitationItem,
  MasteryRecord,
  StudyDocument,
  TutorMessage,
  TutorMode,
  TutorSession,
} from "../types";

const LiveRoomInner: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const audio = useAudioInputManager();
  const zoom = useZoomSession();

  const [session, setSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [masteryRecords, setMasteryRecords] = useState<MasteryRecord[]>([]);
  const [tutorMode, setTutorMode] = useState<TutorMode>("explain");
  const [loadingPage, setLoadingPage] = useState(true);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [compatOpen, setCompatOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [activeFollowup, setActiveFollowup] = useState<{
    question: string;
    concept?: string;
    strategy?: string;
  } | null>(null);

  const [latestDiagram, setLatestDiagram] = useState<{
    title?: string | null;
    mermaid?: string | null;
    fallbackText?: string | null;
  } | null>(null);
  const [latestCitations, setLatestCitations] = useState<CitationItem[]>([]);
  const [roomError, setRoomError] = useState<string | null>(null);

  const refreshMastery = useCallback(async () => {
    if (!user) return;
    try {
      const prog = await api.getProgress(user.id);
      setMasteryRecords(prog.mastery_records);
    } catch {
      // ignore non-blocking refresh error
    }
  }, [user]);

  useEffect(() => {
    if (!sessionId || !user) return;
    let active = true;
    (async () => {
      try {
        const [sess, docs, prog] = await Promise.all([
          api.getSession(sessionId),
          api.listDocuments(user.id),
          api.getProgress(user.id),
        ]);
        if (!active) return;
        setSession(sess);
        setTutorMode(sess.tutor_mode);
        setDocuments(docs.filter((d) => sess.document_ids.includes(d.id)));
        setMasteryRecords(prog.mastery_records);

        const mapped: TutorMessage[] = sess.messages.map((m) => {
          const meta = (m.metadata || {}) as Record<string, unknown>;
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            concept: meta.concept as string | undefined,
            teaching_strategy: meta.teaching_strategy as string | undefined,
            analogy: meta.analogy as string | undefined,
            example: meta.example as string | undefined,
            diagram_title: meta.diagram_title as string | undefined,
            diagram_mermaid: meta.diagram_mermaid as string | undefined,
            followup_question: meta.followup_question as string | undefined,
            citations: meta.citations as CitationItem[] | undefined,
            understanding_level: meta.understanding_level as
              | "strong"
              | "partial"
              | "misconception"
              | undefined,
            misconception_identified: meta.misconception_identified as string | undefined,
          };
        });
        setMessages(mapped);

        const lastWithDiagram = [...mapped].reverse().find((m) => m.diagram_mermaid);
        if (lastWithDiagram) {
          setLatestDiagram({
            title: lastWithDiagram.diagram_title,
            mermaid: lastWithDiagram.diagram_mermaid,
            fallbackText: lastWithDiagram.content,
          });
        }
      } catch (err) {
        if (active) setRoomError(err instanceof Error ? err.message : "Failed to load room.");
      } finally {
        if (active) setLoadingPage(false);
      }
    })();

    return () => {
      active = false;
      audio.cleanupActiveCapture();
      audio.stopSpeaking();
    };
  }, [sessionId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleAskQuestion = async (text: string) => {
    if (!session) return;
    setRoomError(null);
    const optimisticStudent: TutorMessage = {
      id: `local-${Date.now()}`,
      role: "student",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticStudent]);
    setTutorLoading(true);

    try {
      const res = await api.askTutor({
        session_id: session.id,
        question: text,
        tutor_mode: tutorMode,
        document_ids: session.document_ids,
        audio_mode: audio.mode,
      });

      const tutorMsg: TutorMessage = {
        id: res.message_id,
        role: "tutor",
        content: res.explanation,
        timestamp: res.timestamp,
        concept: res.concept,
        teaching_strategy: res.teaching_strategy,
        analogy: res.analogy,
        example: res.example,
        diagram_title: res.diagram_title,
        diagram_mermaid: res.diagram_mermaid,
        followup_question: res.followup_question,
        citations: res.citations,
        insufficient_document_context: res.insufficient_document_context,
      };
      setMessages((prev) => [...prev, tutorMsg]);

      if (res.diagram_mermaid) {
        setLatestDiagram({
          title: res.diagram_title,
          mermaid: res.diagram_mermaid,
          fallbackText: res.explanation,
        });
      }
      setLatestCitations(res.citations);

      if (res.followup_question) {
        setActiveFollowup({
          question: res.followup_question,
          concept: res.concept,
          strategy: res.teaching_strategy,
        });
      }

      const spoken = [res.explanation, res.followup_question].filter(Boolean).join(" ");
      audio.speakText(spoken);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Tutor request failed.");
    } finally {
      setTutorLoading(false);
    }
  };

  const handleEvaluateAnswer = async (answer: string) => {
    if (!session || !activeFollowup) return;
    setRoomError(null);
    const optimisticStudent: TutorMessage = {
      id: `local-${Date.now()}`,
      role: "student",
      content: answer,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticStudent]);
    setTutorLoading(true);

    try {
      const res = await api.evaluateAnswer({
        session_id: session.id,
        question: activeFollowup.question,
        student_answer: answer,
        concept: activeFollowup.concept,
        previous_strategy: activeFollowup.strategy,
        document_ids: session.document_ids,
      });

      const tutorMsg: TutorMessage = {
        id: res.message_id,
        role: "tutor",
        content: `${res.feedback}\n\n${res.adaptive_explanation}`,
        timestamp: res.timestamp,
        concept: res.concept,
        teaching_strategy: res.new_teaching_strategy,
        previous_strategy: res.previous_strategy || undefined,
        analogy: res.analogy,
        example: res.example,
        diagram_title: res.diagram_title,
        diagram_mermaid: res.diagram_mermaid,
        followup_question: res.followup_question,
        citations: res.citations,
        understanding_level: res.understanding_level,
        is_correct: res.is_correct,
        misconception_identified: res.misconception_identified,
        updated_mastery_estimate: res.updated_mastery_estimate,
      };
      setMessages((prev) => [...prev, tutorMsg]);

      if (res.diagram_mermaid) {
        setLatestDiagram({
          title: res.diagram_title,
          mermaid: res.diagram_mermaid,
          fallbackText: res.adaptive_explanation,
        });
      }
      setLatestCitations(res.citations);
      setActiveFollowup({
        question: res.followup_question,
        concept: res.concept,
        strategy: res.new_teaching_strategy,
      });

      await refreshMastery();
      audio.speakText(`${res.feedback} ${res.adaptive_explanation} ${res.followup_question}`);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setTutorLoading(false);
    }
  };

  const handleRequestQuiz = async () => {
    if (!session) return;
    setRoomError(null);
    setTutorLoading(true);
    try {
      const q = await api.generateQuiz({
        session_id: session.id,
        concept: activeFollowup?.concept || session.topic,
        difficulty: session.learning_level,
        document_ids: session.document_ids,
      });
      const quizMsg: TutorMessage = {
        id: q.message_id,
        role: "tutor",
        content: q.question,
        timestamp: q.timestamp,
        concept: q.concept,
        citations: q.citations,
        is_quiz: true,
        hints: q.hints,
      };
      setMessages((prev) => [...prev, quizMsg]);
      setActiveFollowup({
        question: q.question,
        concept: q.concept,
        strategy: "quiz_assessment",
      });
      setLatestCitations(q.citations);
      audio.speakText(q.question);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setTutorLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    audio.cleanupActiveCapture();
    audio.stopSpeaking();
    await api.endSession(session.id).catch(() => undefined);
    navigate(`/summary/${session.id}`);
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-300">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-accent-blue" />
        Opening tutoring room...
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div className="min-h-screen bg-navy-950 p-8 text-center text-slate-300">
        {roomError || "Session not found."}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-950 text-slate-100">
      <Navbar />

      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-4 px-4 py-3 sm:px-6">
        {roomError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
            {roomError}
          </div>
        )}

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT / CENTER: Video + Whiteboard / Video Explainer / Intel (Expanded for maximum learning view) */}
          <div className="flex flex-col gap-3.5 lg:col-span-8 xl:col-span-8">
            <VideoRoom
              sessionId={session.id}
              sessionTopic={session.zoom_session_name}
              userName={user.name}
              audioMode={audio.mode}
              onRunAudioCompatTest={() => setCompatOpen(true)}
              onEndSession={() => void handleEndSession()}
            />

            <LearningIntelPanel
              sessionId={session.id}
              currentTopic={session.topic}
              latestDiagram={latestDiagram}
              latestCitations={latestCitations}
              documents={documents}
              masteryRecords={masteryRecords}
            />
          </div>

          {/* RIGHT: AI Tutor Conversation */}
          <div className="min-h-[500px] lg:col-span-4 xl:col-span-4 lg:h-[calc(100vh-8.5rem)]">
            <TutorChatPanel
              messages={messages}
              tutorMode={tutorMode}
              loading={tutorLoading}
              activeFollowup={activeFollowup}
              onChangeMode={setTutorMode}
              onAskQuestion={handleAskQuestion}
              onEvaluateAnswer={handleEvaluateAnswer}
              onRequestQuiz={handleRequestQuiz}
            />
          </div>
        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="border-t border-slate-800/80 bg-navy-900/90 px-4 py-2.5 text-xs text-slate-300 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5 text-accent-teal" />
              Audio Mode:{" "}
              <strong className="text-teal-300">
                {audio.mode === "push_to_talk"
                  ? "Push-to-Talk (Zoom Mic Isolated)"
                  : audio.mode === "zoom_plus_speech"
                  ? "Simultaneous Zoom + Speech"
                  : "Text Only"}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 text-accent-blue" />
              Mic Owner: <span className="font-mono text-slate-200">{audio.activeOwner}</span>
            </span>
            <span className="text-slate-400">
              Zoom: <strong className="text-slate-200">{zoom.connectionState}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 font-mono text-slate-300">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {formatDuration(elapsedSeconds)}
            </span>
            <button
              type="button"
              onClick={() => void handleEndSession()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              Leave Session
            </button>
          </div>
        </div>
      </footer>

      <AudioCompatModal
        open={compatOpen}
        onClose={() => setCompatOpen(false)}
        zoomConnected={zoom.connectionState === "connected"}
        zoomAudioOn={zoom.zoomAudioOn}
        onEnableZoomAudio={zoom.enableZoomAudio}
        onDisableZoomAudio={zoom.disableZoomAudio}
      />
    </div>
  );
};

export const LiveTutorRoomPage: React.FC = () => (
  <ZoomSessionProvider>
    <LiveRoomInner />
  </ZoomSessionProvider>
);
