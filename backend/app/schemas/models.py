from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


LearningLevel = Literal["beginner", "intermediate", "advanced"]
TutorMode = Literal["explain", "socratic", "quiz", "exam_prep", "revision"]
TeachingStyle = Literal["simple", "socratic", "exam_focused", "detailed"]
MessageRole = Literal["student", "tutor", "system"]


class UserCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=120)
    email: str = Field(..., min_length=3, max_length=255)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str


class SessionCreateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1, max_length=120)
    topic: str = Field(..., min_length=1, max_length=200)
    learning_level: LearningLevel = "intermediate"
    tutor_mode: TutorMode = "explain"
    teaching_style: TeachingStyle = "simple"
    planned_duration_minutes: Optional[int] = Field(default=30, ge=5, le=240)
    document_ids: list[str] = Field(default_factory=list)


class SessionResponse(BaseModel):
    id: str
    user_id: str
    subject: str
    topic: str
    learning_level: LearningLevel
    tutor_mode: TutorMode
    teaching_style: TeachingStyle
    planned_duration_minutes: Optional[int] = None
    zoom_session_name: str
    started_at: str
    ended_at: Optional[str] = None
    document_ids: list[str] = Field(default_factory=list)


class SessionDetailResponse(SessionResponse):
    messages: list[dict[str, Any]] = Field(default_factory=list)
    insights: Optional[dict[str, Any]] = None


class ZoomSignatureRequest(BaseModel):
    session_id: Optional[str] = None
    session_topic: str = Field(..., min_length=3, max_length=200)
    role_type: Literal[0, 1] = 1
    user_identity: Optional[str] = Field(default=None, max_length=120)


class ZoomSignatureResponse(BaseModel):
    signature: str
    session_topic: str
    role_type: int
    expires_in_seconds: int


class CitationItem(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    snippet: str
    score: float = 0.0


class TutorAskRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1, max_length=4000)
    tutor_mode: Optional[TutorMode] = None
    document_ids: Optional[list[str]] = None
    audio_mode: Optional[str] = None


class TutorStructuredResponse(BaseModel):
    message_id: str
    intent: str
    concept: str
    teaching_strategy: str
    explanation: str
    analogy: Optional[str] = None
    example: Optional[str] = None
    diagram_title: Optional[str] = None
    diagram_mermaid: Optional[str] = None
    followup_question: Optional[str] = None
    citations: list[CitationItem] = Field(default_factory=list)
    insufficient_document_context: bool = False
    tutor_mode: TutorMode
    timestamp: str


class TutorQuizRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    concept: Optional[str] = None
    difficulty: Optional[LearningLevel] = None
    document_ids: Optional[list[str]] = None


class TutorQuizResponse(BaseModel):
    message_id: str
    concept: str
    question: str
    question_type: str = "conceptual"
    hints: list[str] = Field(default_factory=list)
    citations: list[CitationItem] = Field(default_factory=list)
    timestamp: str


class TutorEvaluateRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1, max_length=2000)
    student_answer: str = Field(..., min_length=1, max_length=4000)
    concept: Optional[str] = None
    previous_strategy: Optional[str] = None
    document_ids: Optional[list[str]] = None


class TutorEvaluateResponse(BaseModel):
    message_id: str
    concept: str
    is_correct: bool
    understanding_level: Literal["strong", "partial", "misconception"]
    feedback: str
    misconception_identified: Optional[str] = None
    previous_strategy: Optional[str] = None
    new_teaching_strategy: str
    adaptive_explanation: str
    analogy: Optional[str] = None
    example: Optional[str] = None
    diagram_title: Optional[str] = None
    diagram_mermaid: Optional[str] = None
    followup_question: str
    updated_mastery_estimate: float
    citations: list[CitationItem] = Field(default_factory=list)
    timestamp: str


class DocumentProcessRequest(BaseModel):
    document_id: str = Field(..., min_length=1)


class DocumentResponse(BaseModel):
    id: str
    user_id: str
    file_name: str
    storage_path: str
    file_size_bytes: int
    page_count: int
    processing_status: str
    error_message: Optional[str] = None
    chunk_count: int = 0
    created_at: str


class SessionInsightResponse(BaseModel):
    session_id: str
    subject: str
    topic: str
    topics_covered: list[str] = Field(default_factory=list)
    important_explanations: list[str] = Field(default_factory=list)
    questions_asked: list[str] = Field(default_factory=list)
    demonstrated_understanding: str
    weak_concepts: list[str] = Field(default_factory=list)
    misconceptions: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    suggested_next_session: str
    created_at: str


class VideoScene(BaseModel):
    scene_number: int
    title: str
    narration: str
    diagram_mermaid: Optional[str] = None
    key_points: list[str] = Field(default_factory=list)
    visual_focus: Optional[str] = None
    duration_seconds: int = 8


class VideoWalkthroughRequest(BaseModel):
    session_id: str
    topic: Optional[str] = None
    concept: Optional[str] = None
    target_duration_seconds: Optional[int] = 45


class VideoWalkthroughResponse(BaseModel):
    title: str
    topic: str
    total_duration_seconds: int
    summary: str
    scenes: list[VideoScene]

