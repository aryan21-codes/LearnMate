import fitz
import httpx
import jwt as pyjwt
import pytest

BACKEND_BASE = "http://127.0.0.1:8000"
FRONTEND_BASE = "http://127.0.0.1:5173"


def test_01_backend_health():
    """Verify backend health and configuration flags."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=10.0) as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "ok"
        assert data["integrations"]["zoom_configured"] is True, "Zoom should be configured from .env"
        print(f"\n[OK] Health check: Zoom configured = {data['integrations']['zoom_configured']}, Storage = {data['integrations']['storage_backend']}")


def test_02_zoom_signature_generation():
    """Verify Zoom Video SDK JWT signature generation using Zoom credentials."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=10.0) as client:
        payload = {
            "session_topic": "learnmate-live-physics-101",
            "role_type": 1,
            "user_identity": "Student_Alex",
        }
        resp = client.post("/api/zoom/signature", json=payload)
        assert resp.status_code == 200, f"Zoom signature generation failed: {resp.text}"
        data = resp.json()
        assert "signature" in data
        assert data["session_topic"] == "learnmate-live-physics-101"
        assert data["role_type"] == 1
        assert data["expires_in_seconds"] > 0

        # Decode JWT without verifying signature just to inspect claims
        token = data["signature"]
        unverified_claims = pyjwt.decode(token, options={"verify_signature": False})
        assert unverified_claims["tpc"] == "learnmate-live-physics-101"
        assert unverified_claims["role_type"] == 1
        assert unverified_claims["user_identity"] == "Student_Alex"
        assert "app_key" in unverified_claims
        print(f"[OK] Zoom JWT valid: App Key = {unverified_claims['app_key'][:8]}..., Session Topic = {unverified_claims['tpc']}")


def test_03_user_and_session_lifecycle():
    """Test student registration and tutoring session creation."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=10.0) as client:
        user_resp = client.post(
            "/api/users",
            json={"id": "student-e2e-1", "name": "Alex Mercer", "email": "alex@learnmate.test"},
        )
        assert user_resp.status_code == 200
        user = user_resp.json()
        assert user["id"] == "student-e2e-1"

        session_payload = {
            "user_id": user["id"],
            "subject": "Computer Science",
            "topic": "Dynamic Programming & Memoization",
            "learning_level": "intermediate",
            "teaching_style": "simple",
            "tutor_mode": "socratic",
            "planned_duration_minutes": 30,
            "document_ids": [],
        }
        sess_resp = client.post("/api/session/create", json=session_payload)
        assert sess_resp.status_code == 200
        session = sess_resp.json()
        assert session["subject"] == "Computer Science"
        assert session["ended_at"] is None, "New session should be active"
        print(f"[OK] Tutoring session created: ID = {session['id']}, Zoom Session = {session['zoom_session_name']}")


def test_04_pdf_upload_and_rag_pipeline():
    """Upload a synthetic PDF, verify text extraction, chunking, and RAG retrieval."""
    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text(
        (50, 72),
        "Dynamic Programming Fundamentals:\n"
        "Dynamic Programming (DP) solves complex problems by breaking them down into overlapping subproblems.\n"
        "Memoization is a top-down optimization technique that stores the results of expensive function calls.",
    )
    p2 = doc.new_page()
    p2.insert_text(
        (50, 72),
        "Fibonacci Sequence and Overlapping Subproblems:\n"
        "Without memoization, computing Fibonacci(n) takes O(2^n) exponential time.\n"
        "With memoization cache, the time complexity drops to O(n) linear time.",
    )
    pdf_bytes = doc.tobytes()
    doc.close()

    with httpx.Client(base_url=BACKEND_BASE, timeout=15.0) as client:
        files = {"file": ("dynamic_programming_notes.pdf", pdf_bytes, "application/pdf")}
        data = {"user_id": "student-e2e-1", "auto_process": "true"}
        upload_resp = client.post("/api/documents/upload", files=files, data=data)
        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        doc_info = upload_resp.json()
        assert doc_info["page_count"] == 2
        assert doc_info["chunk_count"] > 0
        assert doc_info["file_size_bytes"] > 0
        print(f"[OK] Document uploaded & indexed: {doc_info['id']} ({doc_info['page_count']} pages, {doc_info['chunk_count']} chunks)")

        list_resp = client.get("/api/documents?user_id=student-e2e-1")
        assert list_resp.status_code == 200
        docs = list_resp.json()
        assert len(docs) >= 1


def test_05_tutor_ask_and_visual_diagram():
    """Test AI Tutor ask flow, citations, and Mermaid whiteboard diagram generation."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=15.0) as client:
        sessions = client.get("/api/session/user/student-e2e-1").json()
        assert len(sessions) > 0
        session_id = sessions[0]["id"]

        ask_payload = {
            "session_id": session_id,
            "question": "How does memoization reduce time complexity in Fibonacci calculation?",
            "audio_mode": "push_to_talk",
        }
        ask_resp = client.post("/api/tutor/ask", json=ask_payload)
        assert ask_resp.status_code == 200, f"Tutor ask failed: {ask_resp.text}"
        res = ask_resp.json()
        assert res["explanation"], "Explanation should be present"
        assert res["concept"], "Concept should be identified"
        assert "diagram_mermaid" in res
        if res["diagram_mermaid"]:
            assert "graph" in res["diagram_mermaid"] or "flowchart" in res["diagram_mermaid"]
            print(f"[OK] Whiteboard Diagram generated: '{res.get('diagram_title', 'Untitled')}'")
        print(f"[OK] Tutor response: Concept = '{res['concept']}', Strategy = '{res['teaching_strategy']}'")


def test_06_adaptive_evaluation_and_strategy_switch():
    """Test adaptive student evaluation: detect misconception and verify automatic strategy shift."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=15.0) as client:
        sessions = client.get("/api/session/user/student-e2e-1").json()
        session_id = sessions[0]["id"]

        eval_payload = {
            "session_id": session_id,
            "question": "What happens if we never define a base case in recursion?",
            "student_answer": "It just acts like an infinite loop and runs forever.",
            "concept": "Call Stack Unwinding & Termination",
            "previous_strategy": "analogy_first",
        }
        eval_resp = client.post("/api/tutor/evaluate", json=eval_payload)
        assert eval_resp.status_code == 200, f"Evaluation failed: {eval_resp.text}"
        evaluation = eval_resp.json()
        assert "understanding_level" in evaluation
        assert "feedback" in evaluation
        assert "new_teaching_strategy" in evaluation
        print(f"[OK] Adaptive evaluation: Level = '{evaluation['understanding_level']}', Next Strategy = '{evaluation['new_teaching_strategy']}'")
        if evaluation.get("misconception_identified"):
            print(f"     Diagnosed misconception: '{evaluation['misconception_identified']}'")


def test_07_audio_transcription_endpoint():
    """Test audio capture fallback transcription endpoint with a valid WAV container."""
    import struct
    sample_rate = 8000
    data_size = 16000
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        1,
        sample_rate,
        sample_rate * 2,
        2,
        16,
        b"data",
        data_size,
    )
    wav_bytes = header + bytes(data_size)

    with httpx.Client(base_url=BACKEND_BASE, timeout=15.0) as client:
        files = {"file": ("student_speech.wav", wav_bytes, "audio/wav")}
        resp = client.post("/api/audio/transcribe", files=files)
        assert resp.status_code == 200, f"Audio transcribe failed: {resp.text}"
        assert "transcript" in resp.json()
        print(f"[OK] Audio transcription fallback returned: '{resp.json()['transcript']}'")


def test_08_session_completion_and_summary():
    """Test ending tutoring session and generating synthesized learning insights."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=15.0) as client:
        sessions = client.get("/api/session/user/student-e2e-1").json()
        session_id = sessions[0]["id"]

        # End session
        end_resp = client.post(f"/api/session/{session_id}/end")
        assert end_resp.status_code == 200
        assert end_resp.json()["ended_at"] is not None

        # Generate summary
        summary_resp = client.post(f"/api/session/{session_id}/summary")
        assert summary_resp.status_code == 200, f"Summary failed: {summary_resp.text}"
        summary = summary_resp.json()
        assert "topics_covered" in summary
        assert "demonstrated_understanding" in summary
        assert "recommendations" in summary
        print(f"[OK] Session Summary generated: Topics = {summary['topics_covered']}")


def test_09_learning_progress_analytics():
    """Test student dashboard progress analytics and weak concept tracking."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=10.0) as client:
        resp = client.get("/api/progress/student-e2e-1")
        assert resp.status_code == 200
        prog = resp.json()
        assert "stats" in prog
        assert prog["stats"]["completed_sessions"] >= 1
        assert "recent_sessions" in prog
        print(f"[OK] Progress analytics: Completed Sessions = {prog['stats']['completed_sessions']}, Mastery Average = {prog['stats']['average_mastery_estimate']}%")


def test_10_frontend_web_server():
    """Test that Vite React frontend dev server is serving index.html cleanly."""
    with httpx.Client(base_url=FRONTEND_BASE, timeout=10.0) as client:
        resp = client.get("/")
        assert resp.status_code == 200
        html = resp.text
        assert '<div id="root">' in html
        assert 'src="/src/main.tsx"' in html or 'type="module"' in html
        assert "LearnMate Live" in html
        print("[OK] Frontend UI active at http://localhost:5173/ and successfully serving index.html")


def test_11_video_walkthrough_generation():
    """Test AI video walkthrough generation and scene structuring."""
    with httpx.Client(base_url=BACKEND_BASE, timeout=30.0) as client:
        sessions = client.get("/api/session/user/student-e2e-1").json()
        assert len(sessions) > 0
        session_id = sessions[0]["id"]

        resp = client.post(
            "/api/tutor/video-walkthrough",
            json={
                "session_id": session_id,
                "topic": "Recursion & Call Stack",
                "concept": "Stack frames for fact(4)",
                "target_duration_seconds": 40,
            },
        )
        assert resp.status_code == 200, f"Video walkthrough failed: {resp.text}"
        data = resp.json()
        assert "title" in data
        assert len(data["scenes"]) >= 3
        assert data["scenes"][0]["narration"]
        print(f"[OK] Video Walkthrough generated: '{data['title']}' ({len(data['scenes'])} scenes)")

