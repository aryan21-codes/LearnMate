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

  const [subject, setSubject] = useState(searchParams.get("subject") || "General Studies");
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
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
      if (!subject || subject === "General Studies") {
        const cleanName = file.name.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[_-]/g, " ");
        setSubject(cleanName);
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#0F172A] [background-image:radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:28px_28px]">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-teal-800">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            Session Configuration
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Personalize Your Tutoring Room
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            These settings calibrate the AI tutor&apos;s depth, teaching method, and study material
            grounding.
          </p>
        </div>

        <form
          onSubmit={handleCreateSession}
          className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden"
        >
          {/* Open-Material Coverage Banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 p-4">
            <Sparkles className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-teal-900 font-bold">Open-Topic Tutoring:</strong> You don&apos;t have to lock yourself into a single topic. When you upload or select study notes, LearnMate indexes your entire document so you can ask about <span className="font-semibold text-slate-900">any concept, formula, or chapter</span> in your notes at any time.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Subject / Course
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Biology, Calculus, Operating Systems"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition font-medium"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Focus Topic <span className="font-normal text-slate-400 lowercase">(optional)</span>
                </label>
                <span className="font-mono text-[10px] font-bold text-teal-700">
                  Covers all notes if blank
                </span>
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Leave blank to cover all topics in notes"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition font-medium"
              />
            </div>
          </div>

          {/* Learning Level */}
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Learning Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(["beginner", "intermediate", "advanced"] as LearningLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLearningLevel(lvl)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold capitalize transition ${
                    learningLevel === lvl
                      ? "border-2 border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Style */}
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                  className={`rounded-2xl p-3.5 text-left transition ${
                    teachingStyle === st.id
                      ? "border-2 border-teal-600 bg-teal-50/80 text-teal-950 shadow-sm"
                      : "border border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">{st.title}</div>
                  <div className="mt-1 text-[11px] text-slate-500 leading-normal">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Planned Duration (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 30)}
              className="w-36 rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition font-semibold"
            />
          </div>

          {/* Study Material PDF Upload & Selection */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Study Material (PDF Grounding)
                </div>
                <div className="text-[11px] text-slate-500">
                  Select existing PDFs or upload new notes for citation-backed tutoring.
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-teal-600" />
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
              <p className="text-xs text-slate-400">No PDFs uploaded yet (optional).</p>
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
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition ${
                        active
                          ? "border-2 border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-medium"
                      } disabled:opacity-50`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        <span className="truncate">{doc.file_name}</span>
                      </div>
                      {active && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition disabled:opacity-50"
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
