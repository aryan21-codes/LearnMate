import re
from fastapi import APIRouter, HTTPException

from app.schemas.models import (
    SessionCreateRequest,
    SessionDetailResponse,
    SessionInsightResponse,
    SessionResponse,
)
from app.services.database import db
from app.services.llm_service import LLMConfigError, generate_session_summary

router = APIRouter(prefix="/api/session", tags=["sessions"])


@router.post("/create", response_model=SessionResponse)
def create_session(payload: SessionCreateRequest):
    subject = payload.subject.strip() if payload.subject and payload.subject.strip() else "General Studies"
    topic = payload.topic.strip() if payload.topic and payload.topic.strip() else None

    # If topic is not provided, analyze attached documents or set comprehensive study scope
    if not topic:
        if payload.document_ids:
            doc_titles: list[str] = []
            for doc_id in payload.document_ids:
                doc = db.get_document(doc_id)
                if doc and doc.get("file_name"):
                    clean_name = re.sub(r"\.[a-zA-Z0-9]+$", "", doc["file_name"]).replace("_", " ").replace("-", " ")
                    doc_titles.append(clean_name.strip())
            if doc_titles:
                topic = f"All Topics in {', '.join(doc_titles[:2])}"
        if not topic:
            topic = f"Comprehensive {subject} Review"

    session = db.create_session(
        user_id=payload.user_id,
        subject=subject,
        topic=topic,
        learning_level=payload.learning_level,
        tutor_mode=payload.tutor_mode,
        teaching_style=payload.teaching_style,
        planned_duration_minutes=payload.planned_duration_minutes,
        document_ids=payload.document_ids,
    )
    return session


@router.get("/user/{user_id}", response_model=list[SessionResponse])
def list_user_sessions(user_id: str):
    return db.list_user_sessions(user_id)


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.get_session_messages(session_id)
    insights = db.get_session_insights(session_id)
    return {**session, "messages": messages, "insights": insights}


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(session_id: str):
    session = db.end_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _build_and_save_summary(session_id: str) -> dict:
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.get_session_messages(session_id)
    mastery_records = db.get_user_mastery(session["user_id"])

    try:
        ai_summary = generate_session_summary(session, messages, mastery_records)
    except LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to generate session summary: {exc}")

    saved = db.save_session_insights(session_id, ai_summary)
    return {
        "session_id": session_id,
        "subject": session["subject"],
        "topic": session["topic"],
        "topics_covered": saved["topics_covered"],
        "important_explanations": saved["important_explanations"],
        "questions_asked": saved["questions_asked"],
        "demonstrated_understanding": saved["demonstrated_understanding"],
        "weak_concepts": saved["weak_concepts"],
        "misconceptions": saved["misconceptions"],
        "recommendations": saved["recommendations"],
        "suggested_next_session": saved["suggested_next_session"],
        "created_at": saved["created_at"],
    }


@router.post("/{session_id}/summary", response_model=SessionInsightResponse)
def generate_summary(session_id: str):
    db.end_session(session_id)
    return _build_and_save_summary(session_id)


@router.get("/{session_id}/summary", response_model=SessionInsightResponse)
def get_summary(session_id: str):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    existing = db.get_session_insights(session_id)
    if existing:
        return {
            "session_id": session_id,
            "subject": session["subject"],
            "topic": session["topic"],
            "topics_covered": existing["topics_covered"],
            "important_explanations": existing["important_explanations"],
            "questions_asked": existing["questions_asked"],
            "demonstrated_understanding": existing["demonstrated_understanding"],
            "weak_concepts": existing["weak_concepts"],
            "misconceptions": existing["misconceptions"],
            "recommendations": existing["recommendations"],
            "suggested_next_session": existing["suggested_next_session"],
            "created_at": existing["created_at"],
        }
    return _build_and_save_summary(session_id)
