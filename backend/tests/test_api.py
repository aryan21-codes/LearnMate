import os
import fitz  # PyMuPDF
import jwt as pyjwt
import pytest
from fastapi.testclient import TestClient

# Ensure isolated test DB
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from app.config import get_settings
from app.main import app
from app.prompts.tutor_prompt import choose_alternative_strategy, sanitize_mermaid_diagram
from app.services.document_service import retrieve_relevant_chunks

client = TestClient(app)


def _make_sample_pdf_bytes() -> bytes:
    doc = fitz.open()
    page1 = doc.new_page()
    page1.insert_text(
        (72, 72),
        "Recursion in Computer Science.\n"
        "A recursive function calls itself to solve smaller subproblems.\n"
        "Every recursive function requires a base case to terminate cleanly.",
    )
    page2 = doc.new_page()
    page2.insert_text(
        (72, 72),
        "Call Stack Behavior.\n"
        "Each recursive call pushes a new stack frame onto the call stack.\n"
        "Without a valid base case, the program suffers a stack overflow error.",
    )
    data = doc.tobytes()
    doc.close()
    return data


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "integrations" in body


def test_session_lifecycle_and_progress():
    user_res = client.post(
        "/api/users",
        json={"id": "test-user-1", "name": "Test Student", "email": "test1@example.com"},
    )
    assert user_res.status_code == 200

    sess_res = client.post(
        "/api/session/create",
        json={
            "user_id": "test-user-1",
            "subject": "Computer Science",
            "topic": "Recursion",
            "learning_level": "beginner",
            "tutor_mode": "explain",
            "teaching_style": "simple",
            "planned_duration_minutes": 25,
            "document_ids": [],
        },
    )
    assert sess_res.status_code == 200
    sess = sess_res.json()
    assert sess["subject"] == "Computer Science"
    assert sess["zoom_session_name"].startswith("lm-")

    # Verify session creation with NO topic provided (auto-infers comprehensive review)
    no_topic_res = client.post(
        "/api/session/create",
        json={
            "user_id": "test-user-1",
            "subject": "Biology",
            "document_ids": [],
        },
    )
    assert no_topic_res.status_code == 200
    no_topic_sess = no_topic_res.json()
    assert no_topic_sess["subject"] == "Biology"
    assert "Biology" in no_topic_sess["topic"]

    get_res = client.get(f"/api/session/{sess['id']}")
    assert get_res.status_code == 200

    end_res = client.post(f"/api/session/{sess['id']}/end")
    assert end_res.status_code == 200
    assert end_res.json()["ended_at"] is not None

    prog_res = client.get("/api/progress/test-user-1")
    assert prog_res.status_code == 200
    assert prog_res.json()["stats"]["total_sessions"] >= 1


def test_zoom_signature_generation(monkeypatch):
    monkeypatch.setenv("ZOOM_SDK_KEY", "test_sdk_key_123")
    monkeypatch.setenv("ZOOM_SDK_SECRET", "test_sdk_secret_456")
    get_settings.cache_clear()

    res = client.post(
        "/api/zoom/signature",
        json={"session_topic": "lm-recursion-101", "role_type": 1, "user_identity": "student-1"},
    )
    assert res.status_code == 200
    data = res.json()
    decoded = pyjwt.decode(data["signature"], "test_sdk_secret_456", algorithms=["HS256"])
    assert decoded["app_key"] == "test_sdk_key_123"
    assert decoded["tpc"] == "lm-recursion-101"
    assert decoded["role_type"] == 1
    assert decoded["version"] == 1

    get_settings.cache_clear()


def test_pdf_upload_extraction_and_retrieval():
    pdf_bytes = _make_sample_pdf_bytes()
    upload_res = client.post(
        "/api/documents/upload",
        data={"user_id": "test-user-1", "auto_process": "true"},
        files={"file": ("recursion_notes.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_res.status_code == 200
    doc = upload_res.json()
    assert doc["processing_status"] == "ready"
    assert doc["page_count"] == 2
    assert doc["chunk_count"] >= 2

    chunks = retrieve_relevant_chunks(
        query="Why does stack overflow happen without a base case?",
        document_ids=[doc["id"]],
        top_k=2,
    )
    assert len(chunks) >= 1
    assert any(c["page_number"] == 2 for c in chunks)


def test_mermaid_sanitization_and_strategy_switching():
    assert sanitize_mermaid_diagram("flowchart TD\nA[Start] --> B[End]") is not None
    assert sanitize_mermaid_diagram("flowchart TD\n<script>alert(1)</script>") is None
    assert sanitize_mermaid_diagram("not a mermaid diagram") is None
    assert choose_alternative_strategy("analogy_first") != "analogy_first"
