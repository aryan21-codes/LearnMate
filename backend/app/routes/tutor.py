import json
from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from app.schemas.models import (
    CitationItem,
    TutorAskRequest,
    TutorEvaluateRequest,
    TutorEvaluateResponse,
    TutorQuizRequest,
    TutorQuizResponse,
    TutorStructuredResponse,
)
from app.services.database import db
from app.services.document_service import retrieve_relevant_chunks
from app.services.llm_service import (
    LLMConfigError,
    evaluate_student_response,
    generate_quiz_question,
    generate_tutor_answer,
    transcribe_audio_bytes,
)

router = APIRouter(tags=["tutor"])


def _to_citations(chunks: list[dict]) -> list[CitationItem]:
    return [
        CitationItem(
            document_id=c["document_id"],
            document_name=c["document_name"],
            page_number=c["page_number"],
            snippet=c["snippet"],
            score=c["score"],
        )
        for c in chunks
    ]


def _run_tutor_ask(payload: TutorAskRequest) -> TutorStructuredResponse:
    session = db.get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    active_mode = payload.tutor_mode or session["tutor_mode"]
    if payload.tutor_mode and payload.tutor_mode != session["tutor_mode"]:
        db.update_session_mode(session["id"], payload.tutor_mode)

    db.add_message(
        session_id=session["id"],
        role="student",
        content=payload.question,
        metadata={"audio_mode": payload.audio_mode, "tutor_mode": active_mode},
    )

    doc_ids = payload.document_ids if payload.document_ids is not None else session.get("document_ids", [])
    retrieved = retrieve_relevant_chunks(
        query=payload.question,
        document_ids=doc_ids,
        user_id=session["user_id"] if not doc_ids else None,
        top_k=4,
    )
    weak_concepts = [
        m for m in db.get_user_mastery(session["user_id"]) if m["is_weak_concept"]
    ]
    recent_messages = db.get_session_messages(session["id"])

    try:
        result = generate_tutor_answer(
            session=session,
            question=payload.question,
            tutor_mode=active_mode,
            weak_concepts=weak_concepts,
            recent_messages=recent_messages,
            retrieved_chunks=retrieved,
        )
    except LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI Tutor error: {exc}")

    citations = _to_citations(retrieved)
    tutor_msg = db.add_message(
        session_id=session["id"],
        role="tutor",
        content=result.get("explanation", ""),
        metadata={
            "kind": "ask_response",
            "concept": result.get("concept") or session["topic"],
            "teaching_strategy": result.get("teaching_strategy") or "analogy_first",
            "analogy": result.get("analogy"),
            "example": result.get("example"),
            "diagram_title": result.get("diagram_title"),
            "diagram_mermaid": result.get("diagram_mermaid"),
            "followup_question": result.get("followup_question"),
            "citations": [c.model_dump() for c in citations],
            "insufficient_document_context": bool(
                result.get("insufficient_document_context", False)
            ),
            "tutor_mode": active_mode,
        },
    )

    return TutorStructuredResponse(
        message_id=tutor_msg["id"],
        intent=result.get("intent", "question"),
        concept=result.get("concept") or session["topic"],
        teaching_strategy=result.get("teaching_strategy") or "analogy_first",
        explanation=result.get("explanation", ""),
        analogy=result.get("analogy"),
        example=result.get("example"),
        diagram_title=result.get("diagram_title"),
        diagram_mermaid=result.get("diagram_mermaid"),
        followup_question=result.get("followup_question"),
        citations=citations,
        insufficient_document_context=bool(
            result.get("insufficient_document_context", False)
        ),
        tutor_mode=active_mode,  # type: ignore[arg-type]
        timestamp=tutor_msg["timestamp"],
    )


@router.post("/api/tutor/ask", response_model=TutorStructuredResponse)
def ask_tutor(payload: TutorAskRequest):
    return _run_tutor_ask(payload)


@router.post("/api/tutor/quiz", response_model=TutorQuizResponse)
def quiz_student(payload: TutorQuizRequest):
    session = db.get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    doc_ids = payload.document_ids if payload.document_ids is not None else session.get("document_ids", [])
    query_str = payload.concept or session["topic"]
    retrieved = retrieve_relevant_chunks(
        query=query_str,
        document_ids=doc_ids,
        user_id=session["user_id"] if not doc_ids else None,
        top_k=3,
    )
    weak_concepts = [
        m for m in db.get_user_mastery(session["user_id"]) if m["is_weak_concept"]
    ]
    recent_messages = db.get_session_messages(session["id"])

    try:
        quiz = generate_quiz_question(
            session=session,
            concept=payload.concept,
            difficulty=payload.difficulty or session["learning_level"],
            weak_concepts=weak_concepts,
            recent_messages=recent_messages,
            retrieved_chunks=retrieved,
        )
    except LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Quiz generation failed: {exc}")

    citations = _to_citations(retrieved)
    msg = db.add_message(
        session_id=session["id"],
        role="tutor",
        content=quiz.get("question", ""),
        metadata={
            "kind": "quiz_question",
            "concept": quiz.get("concept") or query_str,
            "question_type": quiz.get("question_type", "conceptual"),
            "hints": quiz.get("hints", []),
            "citations": [c.model_dump() for c in citations],
        },
    )

    return TutorQuizResponse(
        message_id=msg["id"],
        concept=quiz.get("concept") or query_str,
        question=quiz.get("question", ""),
        question_type=quiz.get("question_type", "conceptual"),
        hints=quiz.get("hints", []),
        citations=citations,
        timestamp=msg["timestamp"],
    )


@router.post("/api/tutor/evaluate", response_model=TutorEvaluateResponse)
def evaluate_answer(payload: TutorEvaluateRequest):
    session = db.get_session(payload.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.add_message(
        session_id=session["id"],
        role="student",
        content=payload.student_answer,
        metadata={"answering_question": payload.question},
    )

    doc_ids = payload.document_ids if payload.document_ids is not None else session.get("document_ids", [])
    retrieved = retrieve_relevant_chunks(
        query=f"{payload.concept or session['topic']} {payload.question}",
        document_ids=doc_ids,
        user_id=session["user_id"] if not doc_ids else None,
        top_k=3,
    )
    weak_concepts = [
        m for m in db.get_user_mastery(session["user_id"]) if m["is_weak_concept"]
    ]
    recent_messages = db.get_session_messages(session["id"])

    try:
        ev = evaluate_student_response(
            session=session,
            question=payload.question,
            student_answer=payload.student_answer,
            concept=payload.concept,
            previous_strategy=payload.previous_strategy,
            weak_concepts=weak_concepts,
            recent_messages=recent_messages,
            retrieved_chunks=retrieved,
        )
    except LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Evaluation error: {exc}")

    concept_name = ev.get("concept") or payload.concept or session["topic"]
    understanding = ev.get("understanding_level", "partial")
    if understanding not in ("strong", "partial", "misconception"):
        understanding = "strong" if ev.get("is_correct") else "misconception"

    mastery_row = db.record_mastery_attempt(
        user_id=session["user_id"],
        subject=session["subject"],
        topic=session["topic"],
        concept=concept_name,
        understanding_level=understanding,
        misconception=ev.get("misconception_identified"),
    )

    citations = _to_citations(retrieved)
    full_reply = f"{ev.get('feedback', '')}\n\n{ev.get('adaptive_explanation', '')}".strip()
    tutor_msg = db.add_message(
        session_id=session["id"],
        role="tutor",
        content=full_reply,
        metadata={
            "kind": "evaluation",
            "concept": concept_name,
            "is_correct": bool(ev.get("is_correct", False)),
            "understanding_level": understanding,
            "misconception_identified": ev.get("misconception_identified"),
            "previous_strategy": payload.previous_strategy,
            "teaching_strategy": ev.get("new_teaching_strategy", "step_by_step_trace"),
            "analogy": ev.get("analogy"),
            "example": ev.get("example"),
            "diagram_title": ev.get("diagram_title"),
            "diagram_mermaid": ev.get("diagram_mermaid"),
            "followup_question": ev.get("followup_question"),
            "citations": [c.model_dump() for c in citations],
        },
    )

    return TutorEvaluateResponse(
        message_id=tutor_msg["id"],
        concept=concept_name,
        is_correct=bool(ev.get("is_correct", False)),
        understanding_level=understanding,
        feedback=ev.get("feedback", ""),
        misconception_identified=ev.get("misconception_identified"),
        previous_strategy=payload.previous_strategy,
        new_teaching_strategy=ev.get("new_teaching_strategy", "step_by_step_trace"),
        adaptive_explanation=ev.get("adaptive_explanation", ""),
        analogy=ev.get("analogy"),
        example=ev.get("example"),
        diagram_title=ev.get("diagram_title"),
        diagram_mermaid=ev.get("diagram_mermaid"),
        followup_question=ev.get("followup_question") or "Does this make more sense now?",
        updated_mastery_estimate=float(mastery_row["mastery_score"]),
        citations=citations,
        timestamp=tutor_msg["timestamp"],
    )


@router.post("/api/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio recording.")
    if len(audio_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio clip exceeds 15 MB.")

    try:
        text = transcribe_audio_bytes(audio_bytes, file.filename or "recording.webm")
        # Audio bytes are not retained after transcription
        return {"transcript": text}
    except LLMConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")


@router.websocket("/api/tutor/stream")
async def tutor_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            action = data.get("action", "ask")
            if action == "ask":
                await websocket.send_json({"event": "thinking", "stage": "retrieving_context"})
                req = TutorAskRequest(**data["payload"])
                result = _run_tutor_ask(req)
                await websocket.send_json(
                    {"event": "response", "payload": result.model_dump()}
                )
            elif action == "evaluate":
                await websocket.send_json({"event": "thinking", "stage": "evaluating_answer"})
                req = TutorEvaluateRequest(**data["payload"])
                result = evaluate_answer(req)
                await websocket.send_json(
                    {"event": "evaluation", "payload": result.model_dump()}
                )
            else:
                await websocket.send_json({"event": "error", "detail": f"Unknown action: {action}"})
    except WebSocketDisconnect:
        return
    except HTTPException as exc:
        await websocket.send_json({"event": "error", "detail": exc.detail})
    except Exception as exc:
        await websocket.send_json({"event": "error", "detail": str(exc)})
