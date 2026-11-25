from fastapi import APIRouter

from app.services.database import db

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/{user_id}")
def get_user_progress(user_id: str):
    db.ensure_user(user_id)
    sessions = db.list_user_sessions(user_id, limit=50)
    mastery = db.get_user_mastery(user_id)
    documents = db.list_documents(user_id=user_id)

    weak_concepts = [m for m in mastery if m["is_weak_concept"] or m["mastery_score"] < 60.0]
    total_attempts = sum(m["attempts"] for m in mastery)
    total_correct = sum(m["correct_attempts"] for m in mastery)
    avg_mastery = (
        round(sum(m["mastery_score"] for m in mastery) / len(mastery), 1)
        if mastery
        else 0.0
    )

    recommended_topics: list[dict[str, str]] = []
    for w in weak_concepts[:4]:
        recommended_topics.append(
            {
                "topic": w["topic"],
                "concept": w["concept"],
                "reason": w.get("last_misconception")
                or f"Estimated mastery is {w['mastery_score']}% across {w['attempts']} attempt(s).",
            }
        )

    return {
        "user_id": user_id,
        "stats": {
            "total_sessions": len(sessions),
            "completed_sessions": sum(1 for s in sessions if s.get("ended_at")),
            "uploaded_documents": len(documents),
            "total_attempts": total_attempts,
            "total_correct": total_correct,
            "average_mastery_estimate": avg_mastery,
        },
        "mastery_records": mastery,
        "weak_concepts": weak_concepts,
        "recommended_topics": recommended_topics,
        "recent_sessions": sessions[:10],
    }
