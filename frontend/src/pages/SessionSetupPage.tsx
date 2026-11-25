import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { Navbar } from "../components/common/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import type {
  LearningLevel,
  StudyDocument,
  TeachingStyle,
  TutorMode,
} from "../types";

export const SessionSetupPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [subject, setSubject] = useState("Computer Science");
  const [topic, setTopic] = useState(searchParams.get("topic") || "Recursion & Call Stack");
  const [learningLevel, setLearningLevel] = useState<LearningLevel>("beginner");
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>("simple");
  const [tutorMode, setTutorMode] = useState<TutorMode>("explain");
  const [duration, setDuration] = useState<number>(30);

  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .listDocuments(user.id)
      .then((docs) => {
        setDocuments(docs);
        setSelectedDocs(docs.filter((d) => d.processing_status === "ready").map((d) => d.id));
      })
      .catch(() => undefined);
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const created = await api.uploadDocument(user.id, file);
      setDocuments((prev) => [created, ...prev]);
      if (created.processing_status === "ready") {
        setSelectedDocs((prev) => [...prev, created.id]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload PDF.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const session = await api.createSession({
        user_id: user.id,
        subject,
        topic,
        learning_level: learningLevel,
        tutor_mode: tutorMode,
        teaching_style: teachingStyle,
        planned_duration_minutes: duration,
        document_ids: selectedDocs,
      });
      navigate(`/room/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tutoring session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-teal">
            <Sparkles className="h-3.5 w-3.5" />
            Session Configuration
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Personalize Your Tutoring Room
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            These settings calibrate the AI tutor&apos;s depth, teaching method, and study material
            grounding.
          </p>
        </div>

        <form
          onSubmit={handleCreateSession}
          className="space-y-6 rounded-2xl border border-slate-800 bg-navy-900/70 p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Biology, Calculus, Data Structures"
                className="w-full rounded-xl border border-slate-700/80 bg-navy-950 px-3.5 py-2.5 text-sm text-white focus:border-accent-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Specific Topic
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Cellular Respiration, Recursion"
                className="w-full rounded-xl border border-slate-700/80 bg-navy-950 px-3.5 py-2.5 text-sm text-white focus:border-accent-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Learning Level */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-300">
              Learning Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(["beginner", "intermediate", "advanced"] as LearningLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLearningLevel(lvl)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition ${
                    learningLevel === lvl
                      ? "border-accent-blue bg-accent-blue/15 text-blue-200"
                      : "border-slate-800 bg-navy-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Style */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-300">
              Teaching Style
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(
                [
                  {
                    id: "simple",
                    mode: "explain",
                    title: "Simple Explanations",
                    desc: "Clear language, analogies, and one concept at a time",
                  },
                  {
                    id: "socratic",
                    mode: "socratic",
                    title: "Socratic Teaching",
                    desc: "Guiding questions to help you reason independently",
                  },
                  {
                    id: "exam_focused",
                    mode: "exam_prep",
                    title: "Exam-Focused Teaching",
                    desc: "High-yield concepts, key traps, and scoring points",
                  },
                  {
                    id: "detailed",
                    mode: "explain",
                    title: "Detailed Conceptual Teaching",
                    desc: "Deep mechanics, step-by-step tracing, and rigor",
                  },
                ] as Array<{
                  id: TeachingStyle;
                  mode: TutorMode;
                  title: string;
                  desc: string;
                }>
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setTeachingStyle(st.id);
                    setTutorMode(st.mode);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    teachingStyle === st.id
                      ? "border-accent-teal bg-accent-teal/10 text-teal-100"
                      : "border-slate-800 bg-navy-950 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-semibold">{st.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Planned Duration (optional, minutes)
            </label>
            <input
              type="number"
              min={5}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 30)}
              className="w-36 rounded-xl border border-slate-700/80 bg-navy-950 px-3.5 py-2 text-sm text-white focus:border-accent-blue focus:outline-none"
            />
          </div>

          {/* Study Material PDF Upload & Selection */}
          <div className="rounded-xl border border-slate-800 bg-navy-950/80 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Study Material (PDF Grounding)
                </div>
                <div className="text-[11px] text-slate-400">
                  Select existing PDFs or upload new notes for citation-backed tutoring.
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-accent-teal">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-teal" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-accent-teal" />
                )}
                {uploading ? "Extracting..." : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleUpload}
                />
              </label>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500">No PDFs uploaded yet (optional).</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {documents.map((doc) => {
                  const active = selectedDocs.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      disabled={doc.processing_status !== "ready"}
                      onClick={() => toggleDoc(doc.id)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                        active
                          ? "border-accent-blue bg-accent-blue/15 text-blue-100"
                          : "border-slate-800 bg-navy-900 text-slate-300"
                      } disabled:opacity-50`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-accent-teal" />
                        <span className="truncate">{doc.file_name}</span>
                      </div>
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent-blue" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:opacity-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Live Room...
              </>
            ) : (
              <>
                Enter Live Tutoring Room
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};
