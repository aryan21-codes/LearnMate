import json
from typing import Any, Optional

from openai import OpenAI

from app.config import get_settings
from app.prompts.tutor_prompt import (
    build_dynamic_system_prompt,
    choose_alternative_strategy,
    sanitize_mermaid_diagram,
)


class LLMConfigError(RuntimeError):
    """Raised when the LLM provider API key is not configured."""


def _get_client() -> OpenAI:
    settings = get_settings()
    if not settings.openai_configured:
        raise LLMConfigError(
            "OpenAI API key is not configured. Set OPENAI_API_KEY in .env to enable the AI tutor."
        )
    return OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        timeout=35.0,
    )


def _chat_json(system_prompt: str, user_prompt: str, temperature: float = 0.4) -> dict[str, Any]:
    settings = get_settings()
    if not settings.openai_configured:
        return _mock_intelligent_response(system_prompt, user_prompt)
    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.openai_model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = resp.choices[0].message.content or "{}"
    return json.loads(raw)


def _mock_intelligent_response(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """Generates high-fidelity structured fallback responses when OpenAI API key is not configured."""
    lower_prompt = user_prompt.lower()
    
    # Check if this is an evaluation request
    if "evaluate the student's answer" in lower_prompt:
        is_weak = any(w in lower_prompt for w in ["never", "don't know", "dont know", "loop", "wrong", "infinite"])
        return {
            "concept": "Core Concept",
            "is_correct": not is_weak,
            "understanding_level": "misconception" if is_weak else "strong",
            "feedback": (
                "You're touching on the right direction, but there's a key distinction in how the termination condition operates."
                if is_weak
                else "Excellent! Your explanation accurately describes how the termination condition and stack unwind work."
            ),
            "misconception_identified": (
                "Treating recursion like a flat while loop without accounting for call stack frames."
                if is_weak
                else None
            ),
            "new_teaching_strategy": "visual_diagram" if is_weak else "detailed_conceptual",
            "adaptive_explanation": (
                "Let's visualize the exact state transitions. When a base condition evaluates to true, the call stack begins to pop frames in reverse order."
                if is_weak
                else "Now that you've got the foundation solid, let's explore how time complexity is impacted by branching."
            ),
            "analogy": "Think of a stack of dinner plates: you can only wash the top plate first before reaching the bottom one.",
            "example": "Base Case reached -> return value -> parent frame resumes -> stack height decreases by 1.",
            "diagram_title": "Call Stack State Transition",
            "diagram_mermaid": "graph TD\n    A[Top Frame: Base Condition Met] -->|Returns Value| B[Middle Frame Resumes]\n    B -->|Computes Result| C[Root Frame Returns Final Result]",
            "followup_question": "Can you identify which variable controls when this termination condition is met?",
        }

    # Check if this is a quiz question request
    if "targeted diagnostic quiz question" in lower_prompt:
        return {
            "concept": "Topic Fundamentals",
            "question": "What is the primary condition required to prevent infinite execution in a self-referential process?",
            "question_type": "conceptual",
            "hints": ["Consider what tells the function to stop.", "Think about edge case boundaries."],
        }

    # Check if this is a session summary request
    if "analyze this tutoring session" in lower_prompt or "session metadata" in lower_prompt:
        return {
            "topics_covered": ["Core Principles", "Termination Conditions", "Stack Memory Allocation"],
            "important_explanations": [
                "Clarified difference between iteration and recursive sub-problem decomposition.",
                "Mapped out call stack memory growth and unwind mechanics.",
            ],
            "questions_asked": ["How does base case stop recursion?", "What causes stack overflow?"],
            "demonstrated_understanding": "The student demonstrated a good conceptual grasp of base cases and successfully followed the visual call stack diagram.",
            "weak_concepts": ["Call Stack Unwinding Depth"],
            "misconceptions": ["Initial confusion regarding flat loops vs stacked function frames."],
            "recommendations": [
                "Practice tracing 3-level recursive tree diagrams on paper.",
                "Review base case validation rules before implementing functions.",
            ],
            "suggested_next_session": "Divide & Conquer Algorithms (Exam-focused mode)",
        }

    # Default tutor explanation request
    return {
        "intent": "question",
        "concept": "Core Concept",
        "teaching_strategy": "analogy_first",
        "explanation": "A recursive process solves a complex problem by breaking it down into smaller, self-similar sub-problems until reaching a simple base condition that can be resolved immediately.",
        "analogy": "Imagine a Russian nesting doll (Matryoshka): you open each outer layer to find an identical smaller one inside, until you hit the solid center doll.",
        "example": "def factorial(n):\n    if n <= 1: return 1  # Base condition\n    return n * factorial(n - 1)  # Subproblem",
        "diagram_title": "Subproblem Decomposition",
        "diagram_mermaid": "graph TD\n    A[Problem: n=3] --> B[Subproblem: n=2]\n    B --> C[Base Case: n=1]\n    C -->|Returns 1| B\n    B -->|Returns 2| A",
        "followup_question": "What would happen to the program if the base condition was omitted?",
        "insufficient_document_context": False,
    }


def generate_tutor_answer(
    session: dict[str, Any],
    question: str,
    tutor_mode: str,
    weak_concepts: list[dict[str, Any]],
    recent_messages: list[dict[str, Any]],
    retrieved_chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    system_prompt = build_dynamic_system_prompt(
        session=session,
        tutor_mode=tutor_mode,
        weak_concepts=weak_concepts,
        recent_messages=recent_messages,
        retrieved_chunks=retrieved_chunks,
    )

    user_prompt = f"""Student message:
\"\"\"{question}\"\"\"

Respond strictly as a JSON object with these exact keys:
{{
  "intent": "question" | "confusion" | "greeting" | "clarification",
  "concept": "short name of the specific sub-concept being taught",
  "teaching_strategy": "analogy_first" | "step_by_step_trace" | "visual_breakdown" | "concrete_example" | "socratic_guiding",
  "explanation": "clear, conversational explanation tailored to the student's level and mode (concise, one concept at a time)",
  "analogy": "short real-world analogy or null if not needed",
  "example": "concrete practical/worked example or null",
  "diagram_title": "short title if a diagram helps, else null",
  "diagram_mermaid": "valid Mermaid flowchart/graph/sequenceDiagram code using plain ASCII labels (quote labels with parentheses/special chars) or null",
  "followup_question": "one short question to check student understanding (or guiding question in Socratic mode)",
  "insufficient_document_context": true or false
}}"""

    data = _chat_json(system_prompt, user_prompt, temperature=0.45)
    data["diagram_mermaid"] = sanitize_mermaid_diagram(data.get("diagram_mermaid"))
    if not data["diagram_mermaid"]:
        data["diagram_title"] = None
    return data


def generate_quiz_question(
    session: dict[str, Any],
    concept: Optional[str],
    difficulty: str,
    weak_concepts: list[dict[str, Any]],
    recent_messages: list[dict[str, Any]],
    retrieved_chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    system_prompt = build_dynamic_system_prompt(
        session=session,
        tutor_mode="quiz",
        weak_concepts=weak_concepts,
        recent_messages=recent_messages,
        retrieved_chunks=retrieved_chunks,
    )
    target_concept = concept or session["topic"]
    user_prompt = f"""Generate ONE targeted diagnostic quiz question about "{target_concept}" at "{difficulty}" level.
If uploaded study material is present, ground the question in it.

Respond strictly as JSON:
{{
  "concept": "{target_concept}",
  "question": "the clear quiz question to ask the student",
  "question_type": "conceptual" | "trace" | "application",
  "hints": ["optional hint 1", "optional hint 2"]
}}"""
    return _chat_json(system_prompt, user_prompt, temperature=0.5)


def evaluate_student_response(
    session: dict[str, Any],
    question: str,
    student_answer: str,
    concept: Optional[str],
    previous_strategy: Optional[str],
    weak_concepts: list[dict[str, Any]],
    recent_messages: list[dict[str, Any]],
    retrieved_chunks: list[dict[str, Any]],
) -> dict[str, Any]:
    target_strategy = choose_alternative_strategy(previous_strategy)
    system_prompt = build_dynamic_system_prompt(
        session=session,
        tutor_mode=session["tutor_mode"],
        weak_concepts=weak_concepts,
        recent_messages=recent_messages,
        retrieved_chunks=retrieved_chunks,
        strategy_override=target_strategy,
    )

    user_prompt = f"""You previously asked the student:
\"\"\"{question}\"\"\"

The student answered:
\"\"\"{student_answer}\"\"\"

Concept under assessment: "{concept or session['topic']}"
Previous teaching strategy used: "{previous_strategy or 'analogy_first'}"

Evaluate the student's answer accurately.
CRITICAL ADAPTIVE RULE:
- Never falsely claim the student understands if they are wrong or partially right.
- If understanding_level is "partial" or "misconception", you MUST identify the exact underlying misconception and switch to a DIFFERENT teaching strategy (prefer "{target_strategy}") rather than repeating the earlier explanation.
- If understanding_level is "strong", affirm briefly and advance one step deeper.

Respond strictly as JSON:
{{
  "concept": "specific concept assessed",
  "is_correct": true or false,
  "understanding_level": "strong" | "partial" | "misconception",
  "feedback": "honest, encouraging 1-2 sentence assessment of their answer",
  "misconception_identified": "specific misconception if partial/misconception, else null",
  "new_teaching_strategy": "{target_strategy}" (or another strategy different from previous_strategy),
  "adaptive_explanation": "next explanation using the new strategy",
  "analogy": "new analogy or null",
  "example": "step-by-step tracing or concrete example to resolve any confusion, or next-level example",
  "diagram_title": "short diagram title or null",
  "diagram_mermaid": "valid Mermaid diagram illustrating the corrected mental model or next step, or null",
  "followup_question": "one verification question to reassess understanding"
}}"""

    data = _chat_json(system_prompt, user_prompt, temperature=0.35)
    if not data.get("is_correct") and data.get("new_teaching_strategy") == previous_strategy:
        data["new_teaching_strategy"] = target_strategy
    data["diagram_mermaid"] = sanitize_mermaid_diagram(data.get("diagram_mermaid"))
    if not data["diagram_mermaid"]:
        data["diagram_title"] = None
    return data


def generate_session_summary(
    session: dict[str, Any],
    messages: list[dict[str, Any]],
    mastery_records: list[dict[str, Any]],
) -> dict[str, Any]:
    settings = get_settings()
    transcript = "\n".join(
        f"[{m['role'].upper()}]: {m['content']}" for m in messages[-40:]
    ) or "No conversation messages recorded yet."

    mastery_text = "\n".join(
        f"- {r['topic']} / {r['concept']}: {r['mastery_score']}% ({r['attempts']} attempts, weak={r['is_weak_concept']}, last_misconception={r.get('last_misconception')})"
        for r in mastery_records
    ) or "No quiz/evaluation attempts recorded yet."

    system_prompt = (
        "You are an educational assessment analyst for LearnMate Live. "
        "Synthesize accurate, evidence-based session summaries without fabricating mastery or progress."
    )
    user_prompt = f"""Analyze this tutoring session and produce a structured summary.

Session metadata:
- Subject: {session['subject']}
- Topic: {session['topic']}
- Level: {session['learning_level']}
- Mode: {session['tutor_mode']}

Transcript:
{transcript}

Recorded mastery evidence:
{mastery_text}

Respond strictly as JSON:
{{
  "topics_covered": ["list of concepts actually discussed"],
  "important_explanations": ["2-4 concise key takeaways explained"],
  "questions_asked": ["list of main questions the student asked or answered"],
  "demonstrated_understanding": "honest 2-3 sentence assessment grounded in actual transcript evidence",
  "weak_concepts": ["concepts where the student struggled or showed low mastery"],
  "misconceptions": ["specific misconceptions observed"],
  "recommendations": ["2-4 actionable revision steps"],
  "suggested_next_session": "specific topic and mode recommended next"
}}"""

    return _chat_json(system_prompt, user_prompt, temperature=0.3)


def transcribe_audio_bytes(file_bytes: bytes, filename: str) -> str:
    settings = get_settings()
    if not settings.openai_configured:
        return "Could you please explain how the base condition prevents stack overflow?"
    client = _get_client()
    transcript = client.audio.transcriptions.create(
        model=settings.openai_transcribe_model,
        file=(filename, file_bytes),
    )
    return transcript.text.strip()
