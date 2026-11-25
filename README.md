# LearnMate Live — AI-Powered Interactive Study Tutor

> **Your personal AI tutor. One conversation away from understanding.**

LearnMate Live is a full-stack adaptive study tutoring platform combining a **Zoom Video SDK** virtual learning room, **PDF-grounded RAG**, **voice interaction with microphone contention safeguards**, **Mermaid Smart Whiteboard**, and an **Adaptive Teaching Engine** that detects misconceptions and switches teaching strategies in real time.

---

## Architecture Overview

```text
learnmate-live/
├── backend/
│   ├── app/
│   │   ├── config.py                  # Environment & integration status
│   │   ├── main.py                    # FastAPI app + CORS
│   │   ├── prompts/tutor_prompt.py    # Dynamic tutor prompt, strategies & Mermaid sanitizer
│   │   ├── routes/
│   │   │   ├── system.py              # /api/health, /api/users
│   │   │   ├── session.py             # /api/session/* & summary insights
│   │   │   ├── zoom.py                # /api/zoom/signature (HS256 server-side JWT)
│   │   │   ├── tutor.py               # /api/tutor/ask, /quiz, /evaluate, WS /stream, /audio/transcribe
│   │   │   ├── documents.py           # /api/documents/upload, /process, list
│   │   │   └── progress.py            # /api/progress/{user_id}
│   │   ├── schemas/models.py          # Pydantic request/response schemas
│   │   └── services/
│   │       ├── database.py            # Supabase REST/Storage + local SQLite fallback
│   │       ├── document_service.py    # PyMuPDF extraction, chunking, hybrid RAG retrieval
│   │       ├── llm_service.py         # Modular OpenAI LLM + Whisper transcription
│   │       └── zoom_service.py        # Zoom Video SDK JWT generator
│   ├── tests/test_api.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/Navbar.tsx
│       │   ├── tutor/                 # TutorChatPanel, LearningIntelPanel, AudioCompatModal
│       │   ├── whiteboard/            # MermaidDiagram (securityLevel: "strict")
│       │   └── zoom/                  # ZoomSessionProvider, VideoRoom, SessionControls
│       ├── contexts/AuthContext.tsx
│       ├── hooks/useAudioInputManager.ts
│       ├── pages/                     # Landing, Dashboard, SessionSetup, LiveTutorRoom, SessionSummary
│       └── services/
│           ├── api.ts
│           └── AudioInputManager.ts   # Centralized mic ownership & fallback manager
├── supabase/schema.sql                # PostgreSQL + pgvector + RLS policies
├── .env.example
└── README.md
```

---

## Environment Variables

Copy `.env.example` to `.env` in the repository root (and optionally `frontend/.env` for Vite variables):

```env
# Backend
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# OpenAI (Backend Only)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_TRANSCRIBE_MODEL=whisper-1

# Zoom Video SDK (Backend Only - NEVER expose ZOOM_SDK_SECRET to frontend)
ZOOM_SDK_KEY=your_zoom_video_sdk_key
ZOOM_SDK_SECRET=your_zoom_video_sdk_secret

# Supabase (Optional for local MVP; falls back to SQLite + disk storage if omitted)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=study-materials

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Zoom Video SDK Setup

1. Create a **Video SDK** app (not a standard Meeting SDK app) in the [Zoom App Marketplace](https://marketplace.zoom.us/).
2. Copy your **SDK Key** and **SDK Secret** into `ZOOM_SDK_KEY` and `ZOOM_SDK_SECRET` in `.env`.
3. Never place `ZOOM_SDK_SECRET` in any `VITE_*` variable or frontend file. The FastAPI backend signs short-lived HS256 JWTs (`app_key`, `tpc`, `role_type`, `version: 1`, `iat`, `exp`) via `POST /api/zoom/signature`.
4. Run the frontend on `http://localhost:5173` (or HTTPS in production) because browsers restrict camera/microphone access to secure contexts.

### Audio Contention Mitigation & RTMS Notes

- **`AudioInputManager`** (`frontend/src/services/AudioInputManager.ts`) centralizes microphone ownership between the Zoom Video SDK and AI speech capture.
- **Default Safe Mode (`push_to_talk`)**: Keeps Zoom video running while explicitly releasing Zoom's microphone track (`mediaStream.stopAudio()`) before acquiring speech capture (`SpeechRecognition` or `MediaRecorder` -> `POST /api/audio/transcribe`), and immediately stops `MediaStreamTrack`s after each utterance.
- **Compatibility Lab**: Inside the Live Tutoring Room, click **Audio Compat Check** to run the Phase 1 simultaneous test (`zoom_plus_speech`), inspect devices, and observe automatic fallback on `AUDIO_CAPTURE_FAILED`, error `6011`, or `audio-capture` errors.
- **Future Production Path (Zoom RTMS)**: Zoom Realtime Media Streams (RTMS) can stream live session audio/transcripts server-side over WebSockets without browser mic contention, subject to Zoom account eligibility, RTMS app scopes, and SDK support. It is intentionally decoupled and not required for the MVP.

---

## Supabase Setup (Optional)

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
2. Create a private storage bucket named `study-materials`.
3. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in `.env`.
4. When Supabase variables are omitted, the backend automatically uses local SQLite (`backend/data/learnmate.db`) and disk storage (`backend/data/uploads`) so the full product works out of the box.

---

## Running Locally

### 1. Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run backend tests:

```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
```

### 2. Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.
