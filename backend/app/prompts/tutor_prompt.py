import re
from typing import Any, Optional


BASE_TUTOR_SYSTEM_PROMPT = """You are LearnMate, an intelligent and adaptive personal study tutor.

Your purpose is to make students understand concepts, not simply provide answers.

Teaching principles:

1. Start with simple explanations.
2. Explain only one concept at a time.
3. Use real-world analogies and practical examples.
4. Refer to the student's uploaded study materials when relevant.
5. Never overwhelm the student with unnecessarily long responses.
6. Ask questions to verify whether the student has understood.
7. Evaluate answers accurately.
8. Identify the underlying misconception when a student answers incorrectly.
9. Change the teaching approach when the student struggles.
10. Never falsely claim that the student understands something.
11. Be encouraging and patient.
12. Gradually increase explanation complexity based on demonstrated understanding."""


MODE_GUIDANCE = {
    "explain": "Explain Mode: Teach concepts in simple language, progressively build intuition, provide one clear real-world analogy and example, and ask one check-for-understanding question.",
    "socratic": "Socratic Mode: Do NOT reveal the complete answer upfront. Ask targeted guiding questions that lead the student to reason through the concept step by step.",
    "quiz": "Quiz Mode: Assess the student with focused conceptual or problem-solving questions, evaluate answers rigorously, and explain any errors constructively.",
    "exam_prep": "Exam Preparation Mode: Emphasize key testable concepts, common exam traps, concise scoring points, and structured short/long-answer framing.",
    "revision": "Revision Mode: Summarize core takeaways concisely, conduct quick oral-style recall checks, and spotlight topics needing reinforcement.",
}

TEACHING_STRATEGIES = [
    "analogy_first",
    "step_by_step_trace",
    "visual_breakdown",
    "concrete_example",
    "socratic_guiding",
    "contrast_misconception",
]

_ALLOWED_MERMAID_PREFIXES = (
    "flowchart",
    "graph",
    "sequenceDiagram",
    "stateDiagram-v2",
    "stateDiagram",
    "classDiagram",
    "erDiagram",
    "mindmap",
)


def sanitize_mermaid_diagram(raw: Optional[str]) -> Optional[str]:
    """Validate and sanitize LLM-generated Mermaid syntax.

    Blocks embedded HTML/script tags and ensures a supported Mermaid header.
    Returns None if invalid so the UI falls back cleanly to text explanation.
    """
    if not raw:
        return None
    cleaned = raw.strip()
    # Strip markdown fences if present
    cleaned = re.sub(r"^```(?:mermaid)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    if not cleaned:
        return None

    # Disallow arbitrary HTML/script injections
    lowered = cleaned.lower()
    if "<script" in lowered or "javascript:" in lowered or "onerror=" in lowered or "onload=" in lowered:
        return None

    first_line = cleaned.splitlines()[0].strip()
    if not any(first_line.startswith(prefix) for prefix in _ALLOWED_MERMAID_PREFIXES):
        return None

    return cleaned


def choose_alternative_strategy(previous_strategy: Optional[str]) -> str:
    """Pick a genuinely different teaching strategy when a student struggles."""
    for strat in TEACHING_STRATEGIES:
        if strat != previous_strategy:
            return strat
    return "step_by_step_trace"


def build_dynamic_system_prompt(
    session: dict[str, Any],
    tutor_mode: str,
    weak_concepts: list[dict[str, Any]],
    recent_messages: list[dict[str, Any]],
    retrieved_chunks: list[dict[str, Any]],
    strategy_override: Optional[str] = None,
) -> str:
    weak_list = [
        f"- {w['concept']} (estimated mastery: {w['mastery_score']}%, last issue: {w.get('last_misconception') or 'needs practice'})"
        for w in weak_concepts[:6]
    ]
    weak_block = "\n".join(weak_list) if weak_list else "None identified yet."

    incorrect_notes: list[str] = []
    prev_questions: list[str] = []
    for msg in recent_messages[-10:]:
        if msg["role"] == "student":
            prev_questions.append(f"- {msg['content'][:160]}")
        meta = msg.get("metadata") or {}
        if meta.get("misconception_identified"):
            incorrect_notes.append(f"- {meta['misconception_identified']}")

    docs_block = "No uploaded study material chunks matched this query."
    if retrieved_chunks:
        parts = []
        for idx, ch in enumerate(retrieved_chunks, start=1):
            parts.append(
                f"[Source {idx}: {ch['document_name']}, Page {ch['page_number']}]\n{ch['full_content']}"
            )
        docs_block = "\n\n".join(parts)

    strategy_line = (
        f"\nActive teaching strategy to use now: {strategy_override}"
        if strategy_override
        else ""
    )

    return f"""{BASE_TUTOR_SYSTEM_PROMPT}

--- CURRENT SESSION CONTEXT ---
- Student learning level: {session['learning_level']}
- Subject: {session['subject']}
- Current topic: {session['topic']}
- Teaching style preference: {session.get('teaching_style', 'simple')}
- Current tutor mode: {tutor_mode} -> {MODE_GUIDANCE.get(tutor_mode, MODE_GUIDANCE['explain'])}{strategy_line}

Known weak concepts:
{weak_block}

Previous student questions in this session:
{chr(10).join(prev_questions[-5:]) if prev_questions else 'None yet.'}

Previously identified misconceptions:
{chr(10).join(incorrect_notes[-5:]) if incorrect_notes else 'None yet.'}

--- RETRIEVED STUDY MATERIAL ---
{docs_block}

IMPORTANT GROUNDING RULE:
- Prefer the uploaded study material above over general assumptions whenever relevant.
- When citing uploaded material, refer to the document name and page number.
- If the student asks specifically about their uploaded document and the retrieved chunks do not contain enough information, set "insufficient_document_context" to true and clearly state what is missing rather than fabricating content.

Your ultimate objective is to help the student achieve conceptual understanding."""
