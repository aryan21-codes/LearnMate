export type LearningLevel = "beginner" | "intermediate" | "advanced";
export type TutorMode = "explain" | "socratic" | "quiz" | "exam_prep" | "revision";
export type TeachingStyle = "simple" | "socratic" | "exam_focused" | "detailed";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isSupabaseAuth?: boolean;
}

export interface IntegrationStatus {
  openai_configured: boolean;
  zoom_configured: boolean;
  supabase_configured: boolean;
  storage_backend: string;
  model: string;
}

export interface StudyDocument {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  file_size_bytes: number;
  page_count: number;
  processing_status: "pending" | "processing" | "ready" | "failed";
  error_message?: string | null;
  chunk_count: number;
  created_at: string;
}

export interface TutorSession {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  learning_level: LearningLevel;
  tutor_mode: TutorMode;
  teaching_style: TeachingStyle;
  planned_duration_minutes?: number | null;
  zoom_session_name: string;
  started_at: string;
  ended_at?: string | null;
  document_ids: string[];
}

export interface CitationItem {
  document_id: string;
  document_name: string;
  page_number: number;
  snippet: string;
  score: number;
}

export interface TutorMessage {
  id: string;
  role: "student" | "tutor" | "system";
  content: string;
  timestamp: string;
  concept?: string;
  teaching_strategy?: string;
  previous_strategy?: string;
  analogy?: string | null;
  example?: string | null;
  diagram_title?: string | null;
  diagram_mermaid?: string | null;
  followup_question?: string | null;
  citations?: CitationItem[];
  insufficient_document_context?: boolean;
  understanding_level?: "strong" | "partial" | "misconception";
  is_correct?: boolean;
  misconception_identified?: string | null;
  updated_mastery_estimate?: number;
  is_quiz?: boolean;
  hints?: string[];
}

export interface MasteryRecord {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  concept: string;
  mastery_score: number;
  attempts: number;
  correct_attempts: number;
  is_weak_concept: boolean;
  last_misconception?: string | null;
  updated_at: string;
}

export interface ProgressResponse {
  user_id: string;
  stats: {
    total_sessions: number;
    completed_sessions: number;
    uploaded_documents: number;
    total_attempts: number;
    total_correct: number;
    average_mastery_estimate: number;
  };
  mastery_records: MasteryRecord[];
  weak_concepts: MasteryRecord[];
  recommended_topics: Array<{
    topic: string;
    concept: string;
    reason: string;
  }>;
  recent_sessions: TutorSession[];
}

export interface SessionSummary {
  session_id: string;
  subject: string;
  topic: string;
  topics_covered: string[];
  important_explanations: string[];
  questions_asked: string[];
  demonstrated_understanding: string;
  weak_concepts: string[];
  misconceptions: string[];
  recommendations: string[];
  suggested_next_session: string;
  created_at: string;
}
