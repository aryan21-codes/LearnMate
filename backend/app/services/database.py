import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx

from app.config import DATA_DIR, UPLOAD_DIR, get_settings


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DatabaseService:
    """Unified persistence layer.

    Uses Supabase PostgREST + Storage when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    are configured, and automatically falls back to local SQLite + disk storage for
    zero-config local hackathon development.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.db_path = DATA_DIR / "learnmate.db"
        self._init_sqlite()

    @property
    def use_supabase(self) -> bool:
        return self.settings.supabase_configured

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_sqlite(self) -> None:
        with self._conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tutor_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    topic TEXT NOT NULL,
                    learning_level TEXT NOT NULL,
                    tutor_mode TEXT NOT NULL,
                    teaching_style TEXT NOT NULL DEFAULT 'simple',
                    planned_duration_minutes INTEGER,
                    zoom_session_name TEXT NOT NULL,
                    document_ids TEXT NOT NULL DEFAULT '[]',
                    started_at TEXT NOT NULL,
                    ended_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS session_messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES tutor_sessions(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS study_documents (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    storage_path TEXT NOT NULL,
                    file_size_bytes INTEGER NOT NULL DEFAULT 0,
                    page_count INTEGER NOT NULL DEFAULT 0,
                    processing_status TEXT NOT NULL DEFAULT 'pending',
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    page_number INTEGER NOT NULL,
                    chunk_index INTEGER NOT NULL DEFAULT 0,
                    embedding TEXT,
                    FOREIGN KEY (document_id) REFERENCES study_documents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS student_topic_mastery (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    subject TEXT NOT NULL DEFAULT 'General',
                    topic TEXT NOT NULL,
                    concept TEXT NOT NULL DEFAULT '',
                    mastery_score REAL NOT NULL DEFAULT 0.0,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    correct_attempts INTEGER NOT NULL DEFAULT 0,
                    is_weak_concept INTEGER NOT NULL DEFAULT 0,
                    last_misconception TEXT,
                    updated_at TEXT NOT NULL,
                    UNIQUE (user_id, topic, concept),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS session_insights (
                    id TEXT PRIMARY KEY,
                    session_id TEXT UNIQUE NOT NULL,
                    topics_covered TEXT NOT NULL DEFAULT '[]',
                    important_explanations TEXT NOT NULL DEFAULT '[]',
                    questions_asked TEXT NOT NULL DEFAULT '[]',
                    demonstrated_understanding TEXT NOT NULL DEFAULT '',
                    weak_concepts TEXT NOT NULL DEFAULT '[]',
                    misconceptions TEXT NOT NULL DEFAULT '[]',
                    recommendations TEXT NOT NULL DEFAULT '[]',
                    suggested_next_session TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES tutor_sessions(id) ON DELETE CASCADE
                );
                """
            )

    def _sb_headers(self) -> dict[str, str]:
        key = self.settings.supabase_service_role_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _sb_rest(self, method: str, table: str, params: Optional[dict] = None, json_body: Any = None) -> Any:
        url = f"{self.settings.supabase_url.rstrip('/')}/rest/v1/{table}"
        with httpx.Client(timeout=15.0) as client:
            resp = client.request(
                method, url, headers=self._sb_headers(), params=params, json=json_body
            )
            resp.raise_for_status()
            if resp.text:
                return resp.json()
            return None

    # ---------- Users ----------
    def upsert_user(self, name: str, email: str, user_id: Optional[str] = None) -> dict[str, Any]:
        now = utcnow_iso()
        uid = user_id or str(uuid.uuid4())
        with self._conn() as conn:
            existing = conn.execute(
                "SELECT * FROM users WHERE email = ? OR id = ?", (email, uid)
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE users SET name = ? WHERE id = ?", (name, existing["id"])
                )
                row = conn.execute("SELECT * FROM users WHERE id = ?", (existing["id"],)).fetchone()
                user = dict(row)
            else:
                conn.execute(
                    "INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)",
                    (uid, name, email, now),
                )
                user = {"id": uid, "name": name, "email": email, "created_at": now}

        if self.use_supabase:
            try:
                self._sb_rest(
                    "POST",
                    "users",
                    params={"on_conflict": "email"},
                    json_body={"id": user["id"], "name": user["name"], "email": user["email"]},
                )
            except Exception:
                pass
        return user

    def get_user(self, user_id: str) -> Optional[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None

    def ensure_user(self, user_id: str) -> dict[str, Any]:
        existing = self.get_user(user_id)
        if existing:
            return existing
        return self.upsert_user(name="Student", email=f"{user_id}@local.learnmate", user_id=user_id)

    # ---------- Sessions ----------
    def create_session(
        self,
        user_id: str,
        subject: str,
        topic: str,
        learning_level: str,
        tutor_mode: str,
        teaching_style: str,
        planned_duration_minutes: Optional[int],
        document_ids: list[str],
    ) -> dict[str, Any]:
        self.ensure_user(user_id)
        session_id = str(uuid.uuid4())
        zoom_name = f"lm-{session_id[:12]}"
        now = utcnow_iso()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO tutor_sessions (
                    id, user_id, subject, topic, learning_level, tutor_mode,
                    teaching_style, planned_duration_minutes, zoom_session_name,
                    document_ids, started_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    user_id,
                    subject,
                    topic,
                    learning_level,
                    tutor_mode,
                    teaching_style,
                    planned_duration_minutes,
                    zoom_name,
                    json.dumps(document_ids),
                    now,
                ),
            )
        session = {
            "id": session_id,
            "user_id": user_id,
            "subject": subject,
            "topic": topic,
            "learning_level": learning_level,
            "tutor_mode": tutor_mode,
            "teaching_style": teaching_style,
            "planned_duration_minutes": planned_duration_minutes,
            "zoom_session_name": zoom_name,
            "document_ids": document_ids,
            "started_at": now,
            "ended_at": None,
        }
        if self.use_supabase:
            try:
                self._sb_rest(
                    "POST",
                    "tutor_sessions",
                    json_body={
                        "id": session_id,
                        "user_id": user_id,
                        "subject": subject,
                        "topic": topic,
                        "learning_level": learning_level,
                        "tutor_mode": tutor_mode,
                        "teaching_style": teaching_style,
                        "planned_duration_minutes": planned_duration_minutes,
                        "zoom_session_name": zoom_name,
                        "started_at": now,
                    },
                )
            except Exception:
                pass
        return session

    def get_session(self, session_id: str) -> Optional[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM tutor_sessions WHERE id = ?", (session_id,)
            ).fetchone()
            if not row:
                return None
            data = dict(row)
            data["document_ids"] = json.loads(data.get("document_ids") or "[]")
            return data

    def list_user_sessions(self, user_id: str, limit: int = 20) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM tutor_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?",
                (user_id, limit),
            ).fetchall()
            out = []
            for r in rows:
                d = dict(r)
                d["document_ids"] = json.loads(d.get("document_ids") or "[]")
                out.append(d)
            return out

    def update_session_mode(self, session_id: str, tutor_mode: str) -> None:
        with self._conn() as conn:
            conn.execute(
                "UPDATE tutor_sessions SET tutor_mode = ? WHERE id = ?",
                (tutor_mode, session_id),
            )

    def end_session(self, session_id: str) -> Optional[dict[str, Any]]:
        now = utcnow_iso()
        with self._conn() as conn:
            conn.execute(
                "UPDATE tutor_sessions SET ended_at = ? WHERE id = ? AND ended_at IS NULL",
                (now, session_id),
            )
        if self.use_supabase:
            try:
                self._sb_rest(
                    "PATCH",
                    "tutor_sessions",
                    params={"id": f"eq.{session_id}"},
                    json_body={"ended_at": now},
                )
            except Exception:
                pass
        return self.get_session(session_id)

    # ---------- Messages ----------
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        msg_id = str(uuid.uuid4())
        now = utcnow_iso()
        meta = metadata or {}
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO session_messages (id, session_id, role, content, metadata, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (msg_id, session_id, role, content, json.dumps(meta), now),
            )
        if self.use_supabase:
            try:
                self._sb_rest(
                    "POST",
                    "session_messages",
                    json_body={
                        "id": msg_id,
                        "session_id": session_id,
                        "role": role,
                        "content": content,
                        "metadata": meta,
                        "timestamp": now,
                    },
                )
            except Exception:
                pass
        return {
            "id": msg_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "metadata": meta,
            "timestamp": now,
        }

    def get_session_messages(self, session_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM session_messages WHERE session_id = ? ORDER BY timestamp ASC",
                (session_id,),
            ).fetchall()
            out = []
            for r in rows:
                d = dict(r)
                d["metadata"] = json.loads(d.get("metadata") or "{}")
                out.append(d)
            return out

    # ---------- Documents & Chunks ----------
    def create_document(
        self,
        user_id: str,
        file_name: str,
        storage_path: str,
        file_size_bytes: int,
        doc_id: Optional[str] = None,
    ) -> dict[str, Any]:
        self.ensure_user(user_id)
        did = doc_id or str(uuid.uuid4())
        now = utcnow_iso()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO study_documents (
                    id, user_id, file_name, storage_path, file_size_bytes,
                    page_count, processing_status, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, 'pending', ?)
                """,
                (did, user_id, file_name, storage_path, file_size_bytes, now),
            )
        if self.use_supabase:
            try:
                self._sb_rest(
                    "POST",
                    "study_documents",
                    json_body={
                        "id": did,
                        "user_id": user_id,
                        "file_name": file_name,
                        "storage_path": storage_path,
                        "file_size_bytes": file_size_bytes,
                        "processing_status": "pending",
                        "created_at": now,
                    },
                )
            except Exception:
                pass
        return self.get_document(did)  # type: ignore[return-value]

    def update_document_status(
        self,
        document_id: str,
        status: str,
        page_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        with self._conn() as conn:
            if page_count is not None:
                conn.execute(
                    """
                    UPDATE study_documents
                    SET processing_status = ?, page_count = ?, error_message = ?
                    WHERE id = ?
                    """,
                    (status, page_count, error_message, document_id),
                )
            else:
                conn.execute(
                    """
                    UPDATE study_documents
                    SET processing_status = ?, error_message = ?
                    WHERE id = ?
                    """,
                    (status, error_message, document_id),
                )
        return self.get_document(document_id)

    def get_document(self, document_id: str) -> Optional[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM study_documents WHERE id = ?", (document_id,)
            ).fetchone()
            if not row:
                return None
            doc = dict(row)
            count_row = conn.execute(
                "SELECT COUNT(*) as c FROM document_chunks WHERE document_id = ?",
                (document_id,),
            ).fetchone()
            doc["chunk_count"] = count_row["c"] if count_row else 0
            return doc

    def list_documents(self, user_id: Optional[str] = None) -> list[dict[str, Any]]:
        with self._conn() as conn:
            if user_id:
                rows = conn.execute(
                    "SELECT * FROM study_documents WHERE user_id = ? ORDER BY created_at DESC",
                    (user_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM study_documents ORDER BY created_at DESC"
                ).fetchall()
            docs = []
            for r in rows:
                doc = dict(r)
                count_row = conn.execute(
                    "SELECT COUNT(*) as c FROM document_chunks WHERE document_id = ?",
                    (doc["id"],),
                ).fetchone()
                doc["chunk_count"] = count_row["c"] if count_row else 0
                docs.append(doc)
            return docs

    def replace_document_chunks(
        self, document_id: str, chunks: list[dict[str, Any]]
    ) -> int:
        with self._conn() as conn:
            conn.execute(
                "DELETE FROM document_chunks WHERE document_id = ?", (document_id,)
            )
            for idx, chunk in enumerate(chunks):
                cid = chunk.get("id") or str(uuid.uuid4())
                emb = chunk.get("embedding")
                conn.execute(
                    """
                    INSERT INTO document_chunks (id, document_id, content, page_number, chunk_index, embedding)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        cid,
                        document_id,
                        chunk["content"],
                        chunk["page_number"],
                        chunk.get("chunk_index", idx),
                        json.dumps(emb) if emb is not None else None,
                    ),
                )
        return len(chunks)

    def get_chunks_for_documents(
        self, document_ids: list[str], user_id: Optional[str] = None
    ) -> list[dict[str, Any]]:
        with self._conn() as conn:
            if document_ids:
                placeholders = ",".join("?" for _ in document_ids)
                rows = conn.execute(
                    f"""
                    SELECT dc.*, sd.file_name
                    FROM document_chunks dc
                    JOIN study_documents sd ON sd.id = dc.document_id
                    WHERE dc.document_id IN ({placeholders})
                    ORDER BY dc.page_number ASC, dc.chunk_index ASC
                    """,
                    tuple(document_ids),
                ).fetchall()
            elif user_id:
                rows = conn.execute(
                    """
                    SELECT dc.*, sd.file_name
                    FROM document_chunks dc
                    JOIN study_documents sd ON sd.id = dc.document_id
                    WHERE sd.user_id = ? AND sd.processing_status = 'ready'
                    ORDER BY dc.page_number ASC, dc.chunk_index ASC
                    """,
                    (user_id,),
                ).fetchall()
            else:
                return []

            results = []
            for r in rows:
                d = dict(r)
                d["embedding"] = json.loads(d["embedding"]) if d.get("embedding") else None
                results.append(d)
            return results

    def upload_file_to_storage(self, storage_path: str, file_bytes: bytes) -> str:
        # Always store local working copy for fast PyMuPDF extraction
        local_path = UPLOAD_DIR / Path(storage_path).name
        local_path.write_bytes(file_bytes)
        if self.use_supabase:
            try:
                bucket = self.settings.supabase_storage_bucket
                url = f"{self.settings.supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{storage_path}"
                headers = {
                    "apikey": self.settings.supabase_service_role_key,
                    "Authorization": f"Bearer {self.settings.supabase_service_role_key}",
                    "Content-Type": "application/pdf",
                    "x-upsert": "true",
                }
                with httpx.Client(timeout=20.0) as client:
                    client.post(url, headers=headers, content=file_bytes)
            except Exception:
                pass
        return str(local_path)

    # ---------- Mastery & Learning Intelligence ----------
    def record_mastery_attempt(
        self,
        user_id: str,
        subject: str,
        topic: str,
        concept: str,
        understanding_level: str,
        misconception: Optional[str] = None,
    ) -> dict[str, Any]:
        self.ensure_user(user_id)
        now = utcnow_iso()
        clean_concept = (concept or topic).strip()[:150]
        score_delta = {"strong": 1.0, "partial": 0.5, "misconception": 0.0}.get(
            understanding_level, 0.0
        )

        with self._conn() as conn:
            existing = conn.execute(
                """
                SELECT * FROM student_topic_mastery
                WHERE user_id = ? AND topic = ? AND concept = ?
                """,
                (user_id, topic, clean_concept),
            ).fetchone()

            if existing:
                attempts = existing["attempts"] + 1
                correct = existing["correct_attempts"] + (1 if understanding_level == "strong" else 0)
                prev_score = float(existing["mastery_score"])
                # Evidence-based exponential moving average blended with accuracy rate
                attempt_pct = score_delta * 100.0
                new_score = round(min(100.0, max(0.0, prev_score * 0.55 + attempt_pct * 0.45)), 1)
                is_weak = 1 if (new_score < 60.0 or understanding_level == "misconception") else 0
                conn.execute(
                    """
                    UPDATE student_topic_mastery
                    SET subject = ?, mastery_score = ?, attempts = ?, correct_attempts = ?,
                        is_weak_concept = ?, last_misconception = COALESCE(?, last_misconception),
                        updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        subject,
                        new_score,
                        attempts,
                        correct,
                        is_weak,
                        misconception,
                        now,
                        existing["id"],
                    ),
                )
                row_id = existing["id"]
            else:
                row_id = str(uuid.uuid4())
                attempts = 1
                correct = 1 if understanding_level == "strong" else 0
                # Initial evidence-based estimate (capped reasonably on a single attempt)
                new_score = {"strong": 78.0, "partial": 52.0, "misconception": 25.0}.get(
                    understanding_level, 40.0
                )
                is_weak = 1 if new_score < 60.0 else 0
                conn.execute(
                    """
                    INSERT INTO student_topic_mastery (
                        id, user_id, subject, topic, concept, mastery_score,
                        attempts, correct_attempts, is_weak_concept, last_misconception, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        row_id,
                        user_id,
                        subject,
                        topic,
                        clean_concept,
                        new_score,
                        attempts,
                        correct,
                        is_weak,
                        misconception,
                        now,
                    ),
                )
            row = conn.execute(
                "SELECT * FROM student_topic_mastery WHERE id = ?", (row_id,)
            ).fetchone()
            return dict(row)

    def get_user_mastery(self, user_id: str) -> list[dict[str, Any]]:
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM student_topic_mastery
                WHERE user_id = ?
                ORDER BY updated_at DESC
                """,
                (user_id,),
            ).fetchall()
            out = []
            for r in rows:
                d = dict(r)
                d["is_weak_concept"] = bool(d["is_weak_concept"])
                out.append(d)
            return out

    # ---------- Session Insights ----------
    def save_session_insights(
        self, session_id: str, insight_data: dict[str, Any]
    ) -> dict[str, Any]:
        now = utcnow_iso()
        with self._conn() as conn:
            existing = conn.execute(
                "SELECT id FROM session_insights WHERE session_id = ?", (session_id,)
            ).fetchone()
            payload = (
                json.dumps(insight_data.get("topics_covered", [])),
                json.dumps(insight_data.get("important_explanations", [])),
                json.dumps(insight_data.get("questions_asked", [])),
                insight_data.get("demonstrated_understanding", ""),
                json.dumps(insight_data.get("weak_concepts", [])),
                json.dumps(insight_data.get("misconceptions", [])),
                json.dumps(insight_data.get("recommendations", [])),
                insight_data.get("suggested_next_session", ""),
                now,
            )
            if existing:
                conn.execute(
                    """
                    UPDATE session_insights SET
                        topics_covered = ?, important_explanations = ?, questions_asked = ?,
                        demonstrated_understanding = ?, weak_concepts = ?, misconceptions = ?,
                        recommendations = ?, suggested_next_session = ?, created_at = ?
                    WHERE session_id = ?
                    """,
                    (*payload, session_id),
                )
            else:
                iid = str(uuid.uuid4())
                conn.execute(
                    """
                    INSERT INTO session_insights (
                        id, session_id, topics_covered, important_explanations, questions_asked,
                        demonstrated_understanding, weak_concepts, misconceptions,
                        recommendations, suggested_next_session, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (iid, session_id, *payload),
                )
        return self.get_session_insights(session_id)  # type: ignore[return-value]

    def get_session_insights(self, session_id: str) -> Optional[dict[str, Any]]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM session_insights WHERE session_id = ?", (session_id,)
            ).fetchone()
            if not row:
                return None
            d = dict(row)
            for k in (
                "topics_covered",
                "important_explanations",
                "questions_asked",
                "weak_concepts",
                "misconceptions",
                "recommendations",
            ):
                d[k] = json.loads(d.get(k) or "[]")
            return d


db = DatabaseService()
