-- =========================================================
-- LearnMate Live - Supabase PostgreSQL Schema & RLS Policies
-- =========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Users table (mirrors Supabase auth.users or standalone profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tutor sessions
CREATE TABLE IF NOT EXISTS public.tutor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    learning_level TEXT NOT NULL CHECK (learning_level IN ('beginner', 'intermediate', 'advanced')),
    tutor_mode TEXT NOT NULL CHECK (tutor_mode IN ('explain', 'socratic', 'quiz', 'exam_prep', 'revision')),
    teaching_style TEXT NOT NULL DEFAULT 'simple',
    planned_duration_minutes INTEGER,
    zoom_session_name TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tutor_sessions_user_id ON public.tutor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_started_at ON public.tutor_sessions(started_at DESC);

-- 3. Session messages
CREATE TABLE IF NOT EXISTS public.session_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.tutor_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'tutor', 'system')),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON public.session_messages(session_id, timestamp);

-- 4. Study documents
CREATE TABLE IF NOT EXISTS public.study_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    page_count INTEGER NOT NULL DEFAULT 0,
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_documents_user_id ON public.study_documents(user_id);

-- 5. Document chunks (pgvector 1536 dims for text-embedding-3-small)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.study_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- 6. Student topic mastery (evidence-based estimates)
CREATE TABLE IF NOT EXISTS public.student_topic_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL DEFAULT 'General',
    topic TEXT NOT NULL,
    concept TEXT NOT NULL DEFAULT '',
    mastery_score DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
    attempts INTEGER NOT NULL DEFAULT 0,
    correct_attempts INTEGER NOT NULL DEFAULT 0,
    is_weak_concept BOOLEAN NOT NULL DEFAULT FALSE,
    last_misconception TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, topic, concept)
);

CREATE INDEX IF NOT EXISTS idx_mastery_user_id ON public.student_topic_mastery(user_id);

-- 7. Session insights / summaries
CREATE TABLE IF NOT EXISTS public.session_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID UNIQUE NOT NULL REFERENCES public.tutor_sessions(id) ON DELETE CASCADE,
    topics_covered JSONB NOT NULL DEFAULT '[]'::jsonb,
    important_explanations JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions_asked JSONB NOT NULL DEFAULT '[]'::jsonb,
    demonstrated_understanding TEXT NOT NULL DEFAULT '',
    weak_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    misconceptions JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_next_session TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topic_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_insights ENABLE ROW LEVEL SECURITY;

-- Users can only view/update their own profile
CREATE POLICY "Users select own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Tutor sessions owned by user
CREATE POLICY "Users manage own sessions" ON public.tutor_sessions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Session messages accessible through owned session
CREATE POLICY "Users manage own session messages" ON public.session_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tutor_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tutor_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

-- Study documents owned by user
CREATE POLICY "Users manage own documents" ON public.study_documents
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Document chunks accessible through owned document
CREATE POLICY "Users read own document chunks" ON public.document_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.study_documents d
            WHERE d.id = document_id AND d.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.study_documents d
            WHERE d.id = document_id AND d.user_id = auth.uid()
        )
    );

-- Mastery records owned by user
CREATE POLICY "Users manage own mastery" ON public.student_topic_mastery
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Session insights accessible through owned session
CREATE POLICY "Users manage own session insights" ON public.session_insights
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tutor_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tutor_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );
