import type {
  IntegrationStatus,
  LearningLevel,
  ProgressResponse,
  SessionSummary,
  StudyDocument,
  TeachingStyle,
  TutorMode,
  TutorSession,
  UserProfile,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      detail = errBody.detail || errBody.message || detail;
    } catch {
      // ignore non-json errors
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getHealth: () =>
    request<{ status: string; integrations: IntegrationStatus }>("/api/health"),

  upsertUser: (payload: { id?: string; name: string; email: string }) =>
    request<UserProfile>("/api/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getProgress: (userId: string) =>
    request<ProgressResponse>(`/api/progress/${encodeURIComponent(userId)}`),

  listDocuments: (userId: string) =>
    request<StudyDocument[]>(`/api/documents?user_id=${encodeURIComponent(userId)}`),

  uploadDocument: async (userId: string, file: File): Promise<StudyDocument> => {
    const form = new FormData();
    form.append("file", file);
    form.append("user_id", userId);
    form.append("auto_process", "true");
    return request<StudyDocument>("/api/documents/upload", {
      method: "POST",
      body: form,
    });
  },

  createSession: (payload: {
    user_id: string;
    subject: string;
    topic: string;
    learning_level: LearningLevel;
    tutor_mode: TutorMode;
    teaching_style: TeachingStyle;
    planned_duration_minutes?: number;
    document_ids: string[];
  }) =>
    request<TutorSession>("/api/session/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getSession: (sessionId: string) =>
    request<
      TutorSession & {
        messages: Array<{
          id: string;
          role: "student" | "tutor" | "system";
          content: string;
          metadata: Record<string, unknown>;
          timestamp: string;
        }>;
        insights?: SessionSummary | null;
      }
    >(`/api/session/${encodeURIComponent(sessionId)}`),

  endSession: (sessionId: string) =>
    request<TutorSession>(`/api/session/${encodeURIComponent(sessionId)}/end`, {
      method: "POST",
    }),

  generateSummary: (sessionId: string) =>
    request<SessionSummary>(`/api/session/${encodeURIComponent(sessionId)}/summary`, {
      method: "POST",
    }),

  getSummary: (sessionId: string) =>
    request<SessionSummary>(`/api/session/${encodeURIComponent(sessionId)}/summary`),

  getZoomSignature: (payload: {
    session_id?: string;
    session_topic: string;
    role_type: 0 | 1;
    user_identity?: string;
  }) =>
    request<{
      signature: string;
      session_topic: string;
      role_type: number;
      expires_in_seconds: number;
    }>("/api/zoom/signature", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  askTutor: (payload: {
    session_id: string;
    question: string;
    tutor_mode?: TutorMode;
    document_ids?: string[];
    audio_mode?: string;
  }) =>
    request<{
      message_id: string;
      intent: string;
      concept: string;
      teaching_strategy: string;
      explanation: string;
      analogy?: string | null;
      example?: string | null;
      diagram_title?: string | null;
      diagram_mermaid?: string | null;
      followup_question?: string | null;
      citations: Array<{
        document_id: string;
        document_name: string;
        page_number: number;
        snippet: string;
        score: number;
      }>;
      insufficient_document_context: boolean;
      tutor_mode: TutorMode;
      timestamp: string;
    }>("/api/tutor/ask", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  generateQuiz: (payload: {
    session_id: string;
    concept?: string;
    difficulty?: LearningLevel;
    document_ids?: string[];
  }) =>
    request<{
      message_id: string;
      concept: string;
      question: string;
      question_type: string;
      hints: string[];
      citations: Array<{
        document_id: string;
        document_name: string;
        page_number: number;
        snippet: string;
        score: number;
      }>;
      timestamp: string;
    }>("/api/tutor/quiz", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  evaluateAnswer: (payload: {
    session_id: string;
    question: string;
    student_answer: string;
    concept?: string;
    previous_strategy?: string;
    document_ids?: string[];
  }) =>
    request<{
      message_id: string;
      concept: string;
      is_correct: boolean;
      understanding_level: "strong" | "partial" | "misconception";
      feedback: string;
      misconception_identified?: string | null;
      previous_strategy?: string | null;
      new_teaching_strategy: string;
      adaptive_explanation: string;
      analogy?: string | null;
      example?: string | null;
      diagram_title?: string | null;
      diagram_mermaid?: string | null;
      followup_question: string;
      updated_mastery_estimate: number;
      citations: Array<{
        document_id: string;
        document_name: string;
        page_number: number;
        snippet: string;
        score: number;
      }>;
      timestamp: string;
    }>("/api/tutor/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  transcribeAudio: async (blob: Blob): Promise<{ transcript: string }> => {
    const form = new FormData();
    form.append("file", blob, "speech.webm");
    return request<{ transcript: string }>("/api/audio/transcribe", {
      method: "POST",
      body: form,
    });
  },
};
