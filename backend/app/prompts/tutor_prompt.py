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
    "timeline",
)


def sanitize_mermaid_diagram(raw: Optional[str]) -> Optional[str]:
    """Validate, clean, and auto-repair LLM-generated Mermaid syntax.

    1. Strips markdown fences and any conversational preamble before the diagram header.
    2. Converts unicode arrow variants (⟶, →, ⟹) to standard ASCII arrows (-->).
    3. Quotes unquoted node labels containing parentheses, equals, or colons to prevent syntax errors.
    4. Blocks embedded HTML/script tags.
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

    lines = cleaned.splitlines()
    start_idx: Optional[int] = None
    for i, line in enumerate(lines):
        trimmed = line.strip()
        if any(trimmed.startswith(prefix) for prefix in _ALLOWED_MERMAID_PREFIXES):
            start_idx = i
            break

    if start_idx is None:
        return None

    diagram_lines = lines[start_idx:]
    repaired: list[str] = []

    dash_arrow_sub = re.compile(r"[─—–―\-]+>")
    arrow_sub = re.compile(r"[\u2192\u27F6\u2794\u279C\u21E2\u21A0\u279F\u27A1]")
    double_arrow_sub = re.compile(r"[═=]+>|[\u21D2\u27F9\u21D0\u21D4]")
    left_arrow_sub = re.compile(r"<[─—–―\-]+|[\u2190\u27F5]")
    single_arrow_sub = re.compile(r"(?<!-)->(?!>)")
    bracket_pattern = re.compile(r"(\b[A-Za-z0-9_-]+)\[([^\"\n\]]+)\]")
    edge_pipe_pattern = re.compile(r"(-->|==>|<--)\|([^\"|\n]+)\|")

    for line in diagram_lines:
        # Standardize arrows including box-drawing, unicode arrows, and dashes
        l = dash_arrow_sub.sub("-->", line)
        l = arrow_sub.sub("-->", l)
        l = double_arrow_sub.sub("==>", l)
        l = left_arrow_sub.sub("<--", l)
        l = single_arrow_sub.sub("-->", l)

        # Auto-quote labels containing characters that break Mermaid parser
        def _quote_bracket(match: re.Match) -> str:
            node_id = match.group(1)
            content = match.group(2).strip()
            if (content.startswith('"') and content.endswith('"')) or (
                content.startswith("'") and content.endswith("'")
            ):
                return f"{node_id}[{content}]"
            if not re.match(r"^[A-Za-z0-9_ ]+$", content):
                escaped = content.replace('"', "'")
                return f'{node_id}["{escaped}"]'
            return f"{node_id}[{content}]"

        # Auto-quote edge labels in |label|
        def _quote_pipe(match: re.Match) -> str:
            arrow = match.group(1)
            edge_text = match.group(2).strip()
            if (edge_text.startswith('"') and edge_text.endswith('"')) or (
                edge_text.startswith("'") and edge_text.endswith("'")
            ):
                return f"{arrow}|{edge_text}|"
            if not re.match(r"^[A-Za-z0-9_ ]+$", edge_text):
                escaped = edge_text.replace('"', "'")
                return f'{arrow}|"{escaped}"|'
            return f"{arrow}|{edge_text}|"

        l = bracket_pattern.sub(_quote_bracket, l)
        l = edge_pipe_pattern.sub(_quote_pipe, l)
        repaired.append(l)

    result = "\n".join(repaired).strip()
    return result if result else None


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
- Session Scope: {session['topic']}
- Teaching style preference: {session.get('teaching_style', 'simple')}
- Current tutor mode: {tutor_mode} -> {MODE_GUIDANCE.get(tutor_mode, MODE_GUIDANCE['explain'])}{strategy_line}
- Comprehensive Document Coverage: You are tutoring across all concepts, topics, theorems, and definitions in the student's study material. The student is free to ask questions about ANY topic in their notes. Dynamically identify which specific concept their question addresses, cite relevant sections of their notes, and explain step by step.

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
