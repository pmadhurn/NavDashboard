Here's the **Phase 12 prompt** — AI Assistant module:

```markdown
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — PHASE 12: AI ASSISTANT
# ═══════════════════════════════════════════════════════════════

## PROJECT STATE (DO NOT REGENERATE — ALREADY EXISTS)

NavDashboard is a LiFi device management system. Phases 1–11b are
complete and working. 16 backend modules, 15 database tables,
6 Docker services (nginx, frontend, backend, db, redis, minio).

**Backend modules (16):** auth, devices, couples, pairs, locations,
personnel, inventory, troubleshooting, status, dashboard, search,
audit_trail, comparison, documents, backup, reports

**Database tables (16):** users, audit_logs, devices, device_status_history,
personnel, assignment_history, fitting_materials, material_templates,
locations, location_history, couples, pairs, error_logs,
troubleshoot_entries, status_change_logs, documents

**PostgreSQL extensions active:** postgis, uuid-ossp, vector, pg_trgm, btree_gin

**Current main.py router includes (KEEP ALL 16):**
```python
from modules.auth.router import router as auth_router
from modules.devices.router import router as devices_router
from modules.couples.router import router as couples_router
from modules.pairs.router import router as pairs_router
from modules.locations.router import router as locations_router
from modules.personnel.router import router as personnel_router
from modules.inventory.router import router as inventory_router
from modules.troubleshooting.router import router as troubleshooting_router
from modules.status.router import router as status_router
from modules.dashboard.router import router as dashboard_router
from modules.search.router import router as search_router
from modules.audit_trail.router import router as audit_router
from modules.comparison.router import router as comparison_router
from modules.documents.router import router as documents_router
from modules.backup.router import router as backup_router
from modules.reports.router import router as reports_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(devices_router, prefix="/api/v1/devices", tags=["Devices"])
app.include_router(couples_router, prefix="/api/v1/couples", tags=["Couples"])
app.include_router(pairs_router, prefix="/api/v1/pairs", tags=["Pairs"])
app.include_router(locations_router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(personnel_router, prefix="/api/v1/personnel", tags=["Personnel"])
app.include_router(inventory_router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(troubleshooting_router, prefix="/api/v1/troubleshooting", tags=["Troubleshooting"])
app.include_router(status_router, prefix="/api/v1/status", tags=["Status"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(search_router, prefix="/api/v1/search", tags=["Search"])
app.include_router(audit_router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(comparison_router, prefix="/api/v1/comparison", tags=["Comparison"])
app.include_router(documents_router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(backup_router, prefix="/api/v1/backup", tags=["Backup"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])
```

**Current migrations/env.py model imports (KEEP ALL):**
```python
from shared.audit import AuditLog
from modules.auth.models import User
from modules.devices.models import Device, DeviceStatusHistory
from modules.personnel.models import Person, AssignmentHistory
from modules.inventory.models import FittingMaterial, MaterialTemplate
from modules.locations.models import Location, LocationHistory
from modules.couples.models import Couple
from modules.pairs.models import Pair
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry
from modules.status.models import StatusChangeLog
from modules.documents.models import Document
```

**Current routes.tsx live routes (KEEP ALL):**
```
/ → DashboardPage
/login → LoginPage
/devices → DeviceListPage
/devices/:id → DeviceDetailPage
/couples → CoupleListPage
/couples/:id → CoupleDetailPage
/pairs → PairListPage
/pairs/:id → PairDetailPage
/map → MapViewPage
/troubleshooting → TroubleshootingPage
/search → SearchPage
/audit → AuditTrailPage
/comparison → ComparisonPage
/documents → DocumentsPage
/backup → BackupPage
/reports → ReportsPage
/ai → PlaceholderPage          ← REPLACE THIS
/location-history → PlaceholderPage  (keep as placeholder for Phase 13)
/settings → PlaceholderPage          (keep as placeholder for Phase 13)
```

**Shared component imports (use default imports):**
```typescript
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import PageHeader from '@/shared/components/PageHeader';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
```

**Environment variables available (in .env):**
```
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_EMBED_DIMENSION=768
```

**CRITICAL DEPLOYMENT CONSTRAINT:**
- On developer Mac: Ollama runs locally, accessible at `http://host.docker.internal:11434`
- On Oracle Cloud (1 core, 1GB RAM): Ollama is NOT available
- The AI module MUST gracefully handle Ollama being unavailable
- When Ollama is unavailable: chat endpoint should return a clear message like "AI assistant is not available. Ollama is not running or not reachable."
- All other endpoints (sessions, ingest status) must still work without Ollama

---

## ARCHITECTURE DECISION: DIRECT HTTP (NO LANGCHAIN)

Do NOT use LangChain. Use `httpx` to call the Ollama HTTP API directly.
This reduces dependencies, complexity, and failure points.

**Ollama API endpoints used:**
- `POST /api/embeddings` — generate embeddings
  ```json
  {"model": "nomic-embed-text", "prompt": "text to embed"}
  → {"embedding": [0.1, 0.2, ...]}  // 768-dim vector
  ```
- `POST /api/chat` — chat completion
  ```json
  {"model": "llama3", "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}], "stream": true}
  → streamed NDJSON: {"message": {"role": "assistant", "content": "token"}, "done": false}
  ```
- `GET /api/tags` — list available models
  ```json
  → {"models": [{"name": "llama3", ...}, {"name": "nomic-embed-text", ...}]}
  ```

**pgvector usage:**
- Store embeddings in `embedding_documents` table using `Vector(768)` column
- Similarity search: `SELECT ... ORDER BY embedding <=> $1::vector LIMIT k`
- Use raw SQLAlchemy text queries for vector operations

---

## FILES TO GENERATE (22 total)

### Backend — AI Assistant Module (10 files)
1. `NavDashboard/backend/modules/ai_assistant/__init__.py`
2. `NavDashboard/backend/modules/ai_assistant/models.py`
3. `NavDashboard/backend/modules/ai_assistant/schemas.py`
4. `NavDashboard/backend/modules/ai_assistant/repository.py`
5. `NavDashboard/backend/modules/ai_assistant/service.py`
6. `NavDashboard/backend/modules/ai_assistant/router.py`
7. `NavDashboard/backend/modules/ai_assistant/embeddings.py`
8. `NavDashboard/backend/modules/ai_assistant/retriever.py`
9. `NavDashboard/backend/modules/ai_assistant/prompts.py`
10. `NavDashboard/backend/modules/ai_assistant/chain.py`

### Backend — Modified Files (3 files)
11. `NavDashboard/backend/main.py`
12. `NavDashboard/backend/migrations/env.py`
13. `NavDashboard/backend/requirements.txt`

### Frontend — AI Chat Module (7 files)
14. `NavDashboard/frontend/src/modules/ai_chat/pages/AIChatPage.tsx`
15. `NavDashboard/frontend/src/modules/ai_chat/components/ChatWindow.tsx`
16. `NavDashboard/frontend/src/modules/ai_chat/components/ChatMessage.tsx`
17. `NavDashboard/frontend/src/modules/ai_chat/components/ChatInput.tsx`
18. `NavDashboard/frontend/src/modules/ai_chat/components/SuggestedQueries.tsx`
19. `NavDashboard/frontend/src/modules/ai_chat/components/SourceReference.tsx`
20. `NavDashboard/frontend/src/modules/ai_chat/hooks/useAIChat.ts`

### Frontend — Modified File (1 file)
21. `NavDashboard/frontend/src/app/routes.tsx`

### Nginx — Modified File (1 file)
22. `NavDashboard/nginx/default.conf`

---

## DETAILED SPECIFICATIONS

---

### MODELS (`models.py`)

```python
from core.database import Base, SoftDeleteMixin, CustomFieldsMixin
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PgUUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector
import uuid
import enum
from datetime import datetime
```

**ChatSession:**
- Inherits Base, SoftDeleteMixin
- `user_id`: UUID FK → users.id, nullable=False
- `title`: String, default="New Chat"

**ChatMessage:**
- Inherits Base (provides id, created_at, updated_at, deleted_at)
- `session_id`: UUID FK → chat_sessions.id, nullable=False, indexed
- `role`: String — "user" or "assistant"
- `content`: Text
- `sources`: JSONB, nullable=True — list of source references
- `token_count`: Integer, nullable=True — for tracking usage

**EmbeddingDocument:**
- Inherits Base
- `content`: Text — the text chunk that was embedded
- `source_type`: String — "device", "couple", "pair", "error_log", "troubleshoot", "location", "personnel", "material", "custom"
- `source_id`: UUID, nullable=True — FK to original entity if applicable
- `embedding`: `Vector(768)` — pgvector column, 768 dimensions for nomic-embed-text
- `metadata_json`: JSONB, nullable=True — extra context about the chunk

**IMPORTANT for the Vector column:**
```python
from pgvector.sqlalchemy import Vector

class EmbeddingDocument(Base):
    __tablename__ = "embedding_documents"
    # ... other columns ...
    embedding = Column(Vector(768), nullable=True)
```

This requires the `pgvector` Python package. Add it to requirements.txt.

Follow the same column definition pattern as your existing models (Device, Couple, etc.). If they use `Column(...)` syntax, use that. If they use `Mapped[...]` with `mapped_column(...)`, use that. Be consistent.

---

### SCHEMAS (`schemas.py`)

```python
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    sources: list[dict] | None = None
    token_count: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime | None = None
    message_count: int = 0
    last_message_preview: str | None = None

    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    message: ChatMessageResponse
    session_id: UUID

class StreamChunk(BaseModel):
    """For SSE streaming"""
    token: str
    done: bool = False
    sources: list[dict] | None = None  # only sent with final chunk

class IngestStatusResponse(BaseModel):
    total_documents: int
    last_sync: datetime | None = None
    ollama_available: bool
    ollama_models: list[str] = []
    embedding_model_available: bool
    chat_model_available: bool

class OllamaHealthResponse(BaseModel):
    available: bool
    url: str
    models: list[str] = []
    error: str | None = None
```

---

### EMBEDDINGS (`embeddings.py`)

This module handles all interaction with the Ollama embedding API and pgvector storage.

```python
import httpx
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, delete
from core.config import settings
from modules.ai_assistant.models import EmbeddingDocument

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = getattr(settings, 'OLLAMA_BASE_URL', 'http://host.docker.internal:11434')
EMBED_MODEL = getattr(settings, 'OLLAMA_EMBED_MODEL', 'nomic-embed-text')
EMBED_DIM = getattr(settings, 'OLLAMA_EMBED_DIMENSION', 768)
```

Functions:

- `async def check_ollama_available() -> tuple[bool, list[str]]`
  - Try `httpx.AsyncClient.get(OLLAMA_BASE_URL + "/api/tags", timeout=5.0)`
  - If success: parse model names, return (True, model_names)
  - If fail: return (False, [])
  - NEVER raise — always return gracefully

- `async def embed_text(text: str) -> list[float] | None`
  - Call `POST {OLLAMA_BASE_URL}/api/embeddings` with `{"model": EMBED_MODEL, "prompt": text}`
  - Return the embedding vector (list of 768 floats)
  - If Ollama unavailable: log warning, return None
  - Timeout: 30 seconds

- `async def embed_and_store(db: AsyncSession, content: str, source_type: str, source_id: UUID | None = None, metadata: dict | None = None) -> EmbeddingDocument | None`
  - Call `embed_text(content)`
  - If embedding is None: return None (Ollama unavailable)
  - Create EmbeddingDocument record with the embedding vector
  - `db.add(doc)`, `await db.flush()`
  - Return the document

- `async def batch_embed_and_store(db: AsyncSession, items: list[dict]) -> int`
  - Each item: `{"content": str, "source_type": str, "source_id": UUID|None, "metadata": dict|None}`
  - Call `embed_and_store` for each item
  - Return count of successfully embedded items
  - Process in batches of 10 with `await db.commit()` after each batch

- `async def sync_all_embeddings(db: AsyncSession) -> dict`
  - **This is the main ingestion function.**
  - Queries ALL entities from the database and creates/updates embeddings:
    1. **Devices**: For each device → embed: `"Device {serial_number}, type: {device_type}, status: {status}, notes: {notes}"`
    2. **Couples**: For each couple → embed: `"Couple {name}, status: {status}, has_rf: {has_rf}, location: ({lat}, {lng}), notes: {notes}"`
    3. **Pairs**: For each pair → embed: `"Pair {name}, status: {status}, notes: {notes}"`
    4. **Error Logs**: For each error → embed: `"Error on {entity_type}: {error_type}, severity: {severity}, description: {description}"`
    5. **Troubleshoot Entries**: For each step → embed: `"Troubleshoot step: {step_description}, action: {action_taken}, resolution: {resolution}"`
    6. **Personnel**: For each person → embed: `"Personnel {full_name}, role: {role}, email: {email}"`
    7. **Fitting Materials**: For each material → embed: `"Material {name}, quantity: {quantity} {unit}, for couple: {couple_id}"`
    8. **Location History**: For each entry → embed: `"Location change for couple {couple_id}: moved from ({old_lat},{old_lng}) to ({new_lat},{new_lng}), distance: {distance}m"`
  - Before embedding: delete existing embeddings for that source_type + source_id to avoid duplicates
  - Return summary: `{"total_synced": N, "by_type": {"device": 10, "couple": 4, ...}, "errors": 0}`
  - If Ollama unavailable: return `{"total_synced": 0, "error": "Ollama not available"}`

Import models from other modules:
```python
from modules.devices.models import Device
from modules.couples.models import Couple
from modules.pairs.models import Pair
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry
from modules.personnel.models import Person
from modules.inventory.models import FittingMaterial
from modules.locations.models import LocationHistory
```

---

### RETRIEVER (`retriever.py`)

Handles similarity search and context assembly.

```python
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from modules.ai_assistant.embeddings import embed_text, EMBED_DIM

logger = logging.getLogger(__name__)
```

Functions:

- `async def vector_search(db: AsyncSession, query_text: str, limit: int = 5, source_types: list[str] | None = None) -> list[dict]`
  - Embed the query text using `embed_text()`
  - If embedding is None: return [] (Ollama unavailable)
  - Run pgvector similarity search:
    ```python
    sql = """
        SELECT id, content, source_type, source_id, metadata_json,
               1 - (embedding <=> :query_vec::vector) as similarity
        FROM embedding_documents
        WHERE embedding IS NOT NULL
    """
    if source_types:
        sql += " AND source_type = ANY(:source_types)"
    sql += " ORDER BY embedding <=> :query_vec::vector LIMIT :limit"
    ```
  - Convert embedding list to string format for pgvector: `"[0.1, 0.2, ...]"`
  - Return list of dicts: `[{"content": ..., "source_type": ..., "source_id": ..., "similarity": ..., "metadata": ...}]`

- `async def structured_search(db: AsyncSession, query: str) -> list[dict]`
  - Perform keyword-based search across entities (similar to search module)
  - Search devices by serial_number, couples by name, pairs by name, errors by description
  - Use ILIKE for fuzzy matching
  - Return list of dicts with entity info
  - This provides results even when Ollama is down (no embeddings needed)

- `async def hybrid_retrieve(db: AsyncSession, query: str, limit: int = 10) -> list[dict]`
  - Call both `vector_search` and `structured_search`
  - Merge results, remove duplicates (by source_id)
  - Sort by relevance (vector similarity score, then structured matches)
  - Return top `limit` results

- `def build_context(retrieved_docs: list[dict]) -> str`
  - Format retrieved documents into a context string for the LLM:
    ```
    Context from NavDashboard database:

    [Source: device] Device IU-00001, type: IU, status: WORKING, ...
    [Source: error_log] Error on couple A2: Signal Degradation, severity: MEDIUM, ...
    [Source: troubleshoot] Troubleshoot step: Checked OU alignment, action: ...
    ```
  - Truncate total context to ~3000 characters to fit in prompt
  - Return the formatted string

- `def extract_source_references(retrieved_docs: list[dict]) -> list[dict]`
  - Convert retrieved docs into source reference format for the frontend:
    ```python
    [
        {"entity_type": "device", "entity_id": "...", "name": "IU-00001", "snippet": "..."},
        {"entity_type": "error_log", "entity_id": "...", "name": "Signal Degradation", "snippet": "..."},
    ]
    ```

---

### PROMPTS (`prompts.py`)

```python
SYSTEM_PROMPT = """You are NavDashboard AI, an expert assistant for managing LiFi (Light Fidelity) devices.

You have access to a database containing:
- Devices: Indoor Units (IU), Outdoor Units (OU), Hybrid Cables (HC), and RF Listeners (RF), each with serial numbers, statuses, and assignments
- Couples: Pairs of devices (IU + OU + HC, optionally RF) deployed at specific locations
- Pairs: Two couples linked together forming a complete LiFi communication link
- Troubleshooting: Error logs with severity levels and step-by-step troubleshooting entries
- Personnel: Technicians and managers responsible for handling devices
- Locations: GPS coordinates and movement history of deployed couples
- Fitting Materials: Hardware and accessories used at each deployment site

When answering questions:
1. Use the provided context to give accurate, specific answers
2. Reference device serial numbers, couple names, and pair names when relevant
3. If the context doesn't contain enough information, say so clearly
4. For troubleshooting questions, provide step-by-step guidance based on historical data
5. Keep responses concise but complete
6. Format lists and steps clearly using markdown"""

QUERY_CLASSIFICATION_PROMPT = """Classify the following user query into one of these categories:
- DATA_LOOKUP: User wants to find specific device/couple/pair information
- TROUBLESHOOTING: User needs help diagnosing or fixing an issue
- STATUS_CHECK: User wants to know the current status of entities
- ANALYTICS: User wants statistics or trends
- GENERAL: General question about the system or LiFi technology

Query: {query}

Respond with just the category name."""

NO_OLLAMA_MESSAGE = """I'm sorry, but the AI assistant is currently unavailable. The Ollama service is not running or not reachable.

**To enable the AI assistant:**
1. Install Ollama from https://ollama.com
2. Start Ollama: `ollama serve`
3. Pull required models: `ollama pull llama3` and `ollama pull nomic-embed-text`
4. The assistant will automatically connect when Ollama is available.

In the meantime, you can use the **Search** feature to find information across all devices, couples, and pairs."""

NO_CONTEXT_MESSAGE = """I don't have enough context in the database to answer this question specifically. 

You might want to:
1. Run **Sync Embeddings** from the AI settings to index all current data
2. Try rephrasing your question with specific device serial numbers or couple names
3. Use the **Search** page for direct database queries"""
```

---

### CHAIN (`chain.py`)

The RAG chain orchestrator. Calls retriever → builds prompt → calls Ollama → returns response.

```python
import httpx
import json
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator
from core.config import settings
from modules.ai_assistant.retriever import hybrid_retrieve, build_context, extract_source_references
from modules.ai_assistant.prompts import SYSTEM_PROMPT, NO_OLLAMA_MESSAGE, NO_CONTEXT_MESSAGE
from modules.ai_assistant.embeddings import check_ollama_available

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = getattr(settings, 'OLLAMA_BASE_URL', 'http://host.docker.internal:11434')
CHAT_MODEL = getattr(settings, 'OLLAMA_MODEL', 'llama3')
```

Functions:

- `async def generate_response(db: AsyncSession, user_message: str, chat_history: list[dict] | None = None) -> dict`
  - **Non-streaming version**
  - 1. Check Ollama availability → if not available, return `{"content": NO_OLLAMA_MESSAGE, "sources": []}`
  - 2. Call `hybrid_retrieve(db, user_message)` → get relevant context
  - 3. Build context string with `build_context()`
  - 4. Extract source references with `extract_source_references()`
  - 5. Construct messages array:
    ```python
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + context},
    ]
    # Add last 6 messages from chat_history (if provided) for conversation continuity
    if chat_history:
        for msg in chat_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})
    ```
  - 6. Call Ollama: `POST {OLLAMA_BASE_URL}/api/chat` with `{"model": CHAT_MODEL, "messages": messages, "stream": false}`
  - 7. Parse response, return: `{"content": response_text, "sources": source_references}`
  - Timeout: 120 seconds (LLM can be slow)
  - On error: return `{"content": "I encountered an error generating a response. Please try again.", "sources": []}`

- `async def generate_response_stream(db: AsyncSession, user_message: str, chat_history: list[dict] | None = None) -> AsyncGenerator[str, None]`
  - **Streaming version (Server-Sent Events)**
  - Steps 1-5 same as non-streaming
  - 6. Call Ollama with `stream: true`, read NDJSON lines
  - 7. For each chunk: yield SSE-formatted data:
    ```python
    yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"
    ```
  - 8. After final chunk: yield sources:
    ```python
    yield f"data: {json.dumps({'token': '', 'done': True, 'sources': source_references})}\n\n"
    ```
  - On error: yield error message as final chunk

- `async def generate_session_title(user_message: str) -> str`
  - If Ollama available: ask it to generate a short title for the conversation
    - Prompt: `"Generate a very short title (5 words max) for a conversation that starts with: {user_message}. Respond with just the title, no quotes."`
  - If Ollama unavailable: return first 50 chars of user_message as title
  - Timeout: 10 seconds

---

### REPOSITORY (`repository.py`)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete
from uuid import UUID
from typing import Optional
from modules.ai_assistant.models import ChatSession, ChatMessage, EmbeddingDocument
```

Functions:

- `async def create_session(db, user_id: UUID, title: str = "New Chat") -> ChatSession`
- `async def get_session(db, session_id: UUID) -> Optional[ChatSession]`
- `async def get_user_sessions(db, user_id: UUID, skip: int = 0, limit: int = 50) -> list[dict]`
  - Returns sessions with message_count and last_message_preview (LEFT JOIN ChatMessage, ORDER BY latest message timestamp DESC)
- `async def update_session_title(db, session_id: UUID, title: str) -> ChatSession`
- `async def delete_session(db, session_id: UUID)` — hard delete session + its messages
- `async def add_message(db, session_id: UUID, role: str, content: str, sources: list[dict] | None = None, token_count: int | None = None) -> ChatMessage`
- `async def get_session_messages(db, session_id: UUID, skip: int = 0, limit: int = 100) -> list[ChatMessage]`
  - ORDER BY created_at ASC (chronological)
- `async def get_embedding_count(db) -> int`
- `async def get_last_sync_time(db) -> Optional[datetime]`
  - MAX(created_at) from embedding_documents

---

### SERVICE (`service.py`)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from modules.ai_assistant import repository, chain, embeddings
from modules.ai_assistant.schemas import *
from shared.audit import record_audit
```

Functions:

- `async def send_message(db, session_id: UUID | None, user_id: UUID, content: str) -> dict`
  - If session_id is None: create new session, generate title
  - Save user message to DB
  - Load chat history (last 10 messages from this session)
  - Call `chain.generate_response(db, content, chat_history)`
  - Save assistant message to DB (with sources)
  - Return: `{"message": ChatMessageResponse, "session_id": UUID}`

- `async def send_message_stream(db, session_id: UUID | None, user_id: UUID, content: str) -> AsyncGenerator`
  - If session_id is None: create new session, generate title
  - Save user message to DB
  - Load chat history
  - Yield from `chain.generate_response_stream(db, content, chat_history)`
  - After streaming complete: save full assistant message to DB
  - **Note:** For streaming, the full response needs to be accumulated to save to DB. Yield tokens as they come, but also collect them.

- `async def get_sessions(db, user_id: UUID) -> list[ChatSessionResponse]`
- `async def get_session_messages(db, session_id: UUID) -> list[ChatMessageResponse]`
- `async def delete_session(db, session_id: UUID, user_id: UUID)`
- `async def trigger_sync(db, user_id: UUID) -> dict`
  - Call `embeddings.sync_all_embeddings(db)`
  - Record audit
  - Return sync summary
- `async def get_ingest_status(db) -> IngestStatusResponse`
  - Check Ollama availability
  - Get embedding count + last sync time
  - Check if required models are available
  - Return IngestStatusResponse

---

### ROUTER (`router.py`, prefix: `/ai`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Send message, get full response. Body: `{"content": "...", "session_id": "..." (optional)}`. Returns ChatResponse. |
| POST | `/chat/stream` | Send message, get SSE stream. Body: `{"content": "...", "session_id": "..." (optional)}`. Returns `EventSourceResponse`. |
| GET | `/sessions` | List chat sessions for current user. Returns list[ChatSessionResponse]. |
| GET | `/sessions/{session_id}` | Get session with messages. Returns `{"session": ChatSessionResponse, "messages": list[ChatMessageResponse]}`. |
| DELETE | `/sessions/{session_id}` | Delete a chat session. |
| POST | `/ingest` | Trigger embedding sync. Returns sync summary dict. |
| GET | `/ingest/status` | Get sync status + Ollama health. Returns IngestStatusResponse. |
| GET | `/health` | Check Ollama connectivity. Returns OllamaHealthResponse. |

All require `Depends(get_current_user)`.

**For SSE streaming:**
```python
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def chat_stream(
    request: ChatMessageCreate,
    session_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    async def event_generator():
        async for chunk in service.send_message_stream(db, session_id, current_user.id, request.content):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
```

---

### FRONTEND — AI CHAT MODULE

**`useAIChat.ts`:**
```typescript
interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string | null;
  message_count: number;
  last_message_preview: string | null;
}

interface ChatMessageItem {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceRef[] | null;
  token_count: number | null;
  created_at: string;
}

interface SourceRef {
  entity_type: string;
  entity_id: string;
  name: string;
  snippet: string;
}

interface IngestStatus {
  total_documents: number;
  last_sync: string | null;
  ollama_available: boolean;
  ollama_models: string[];
  embedding_model_available: boolean;
  chat_model_available: boolean;
}
```

Hooks:
- `useChatSessions()` → `useQuery` GET `/api/v1/ai/sessions`
- `useChatMessages(sessionId: string)` → `useQuery` GET `/api/v1/ai/sessions/{sessionId}`, enabled when sessionId truthy
- `useSendMessage()` → `useMutation` POST `/api/v1/ai/chat` with `{content, session_id}`
  - On success: invalidate `['chat-sessions']` and `['chat-messages', sessionId]`
- `useDeleteSession()` → `useMutation` DELETE `/api/v1/ai/sessions/{id}`
  - On success: invalidate `['chat-sessions']`
- `useIngestStatus()` → `useQuery` GET `/api/v1/ai/ingest/status`, refetchInterval: 30000
- `useTriggerIngest()` → `useMutation` POST `/api/v1/ai/ingest`
- `useSendMessageStream()` → custom hook (NOT useMutation) that:
  1. POSTs to `/api/v1/ai/chat/stream` using `fetch` with `ReadableStream`
  2. Reads SSE chunks and updates local state with each token
  3. Returns `{ sendStream, streamingContent, isStreaming, sources }`
  4. Implementation:
  ```typescript
  export function useSendMessageStream() {
    const [streamingContent, setStreamingContent] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [sources, setSources] = useState<SourceRef[]>([]);
    const qc = useQueryClient();

    const sendStream = async (content: string, sessionId?: string) => {
      setStreamingContent('');
      setIsStreaming(true);
      setSources([]);

      const token = localStorage.getItem('token');
      const url = sessionId
        ? `/api/v1/ai/chat/stream?session_id=${sessionId}`
        : '/api/v1/ai/chat/stream';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.token) {
                accumulated += data.token;
                setStreamingContent(accumulated);
              }
              if (data.done && data.sources) {
                setSources(data.sources || []);
              }
            } catch {}
          }
        }
      }

      setIsStreaming(false);
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      qc.invalidateQueries({ queryKey: ['chat-messages'] });
    };

    return { sendStream, streamingContent, isStreaming, sources };
  }
  ```

---

**`AIChatPage.tsx`:**
- Two-panel layout:
  - **Left sidebar** (280px wide, glass background `#0B0B0B`):
    - "New Chat" button (GlassButton primary, full width) at top
    - Session list below: each session shows title (truncated), last message preview, relative timestamp
    - Active session: background `#1E1E1E` with left border accent
    - Hover: `#1A1A1A`
    - Delete button on hover (small X icon, with ConfirmDialog)
    - Bottom section: Ingest status indicator
      - Green dot + "AI Ready" if Ollama available
      - Red dot + "AI Offline" if not
      - "Sync Data" button to trigger embedding sync
      - Last sync time
  - **Right main area**:
    - If no session selected: welcome screen with SuggestedQueries
    - If session selected: ChatWindow
- State: `activeSessionId` in useState
- Clicking "New Chat" → clear activeSessionId, show welcome screen
- Clicking a session → set activeSessionId, load messages

**`ChatWindow.tsx`:**
- Props: `sessionId: string | null`, `onSessionCreated: (id: string) => void`
- Scrollable message area (flex-grow, overflow-y auto)
- Auto-scrolls to bottom on new messages (useRef + useEffect)
- Renders ChatMessage components for each message
- If streaming: render a temporary ChatMessage with `streamingContent` and a typing indicator
- At bottom: ChatInput
- Uses `useChatMessages(sessionId)` to load messages
- Uses `useSendMessageStream()` for sending

**`ChatMessage.tsx`:**
- Props: `message: {role, content, sources, created_at}`, `isStreaming?: boolean`
- User messages:
  - Aligned right
  - Background: `#2A2A2A` with glass blur
  - Border-radius: 16px 16px 4px 16px
  - Max-width: 70%
- Assistant messages:
  - Aligned left
  - Background: `#141414` with glass blur
  - Border-radius: 16px 16px 16px 4px
  - Max-width: 80%
  - Content rendered as Markdown (use a simple markdown renderer — parse `**bold**`, `*italic*`, `` `code` ``, `- lists`, `### headings`, ```code blocks```)
    - For simplicity: use `dangerouslySetInnerHTML` with a basic markdown-to-HTML converter function, OR use `react-markdown` if it's already available, OR write a simple parser
    - Code blocks: background `#1A1A1A`, border `#2E2E2E`, monospace font, padding
  - If `sources` present and not empty: render SourceReference components at bottom
- Typing indicator (if isStreaming): pulsing dots animation `...`
- Timestamp below message: muted `#7A7A7A`, small text, relative time

**`ChatInput.tsx`:**
- Glass-styled input area at bottom of chat
- Textarea (auto-grows up to 4 lines, then scrolls)
  - Background: `rgba(255,255,255,0.03)`
  - Border: `1px solid #2A2A2A`
  - Focus: border `#C9C9C9`
  - Color: `#F2F2F2`
  - Placeholder: "Ask about devices, troubleshooting, configurations..."
- Send button (right side, GlassButton primary, icon: SendOutlined from @ant-design/icons)
  - Or use → arrow icon
- Keyboard: Enter to send, Shift+Enter for new line
- Disabled state while AI is streaming (button shows loading spinner)
- Props: `onSend: (content: string) => void`, `disabled: boolean`

**`SuggestedQueries.tsx`:**
- Props: `onSelect: (query: string) => void`
- Displayed on welcome screen (no active session)
- Header: "NavDashboard AI Assistant" with robot icon, subtitle "Ask me anything about your LiFi devices"
- Grid of 6 glass cards (2×3 or 3×2), each with a pre-written query:
  1. "What is the current status of all pairs?"
  2. "Show me all faulty devices"
  3. "How to troubleshoot OU connection issues?"
  4. "List all devices at each location"
  5. "What errors were reported recently?"
  6. "Summarize the system health"
- Each card: icon + query text
- Click → calls `onSelect(query)` which triggers sending that message
- Glass hover effect (border glow)

**`SourceReference.tsx`:**
- Props: `source: {entity_type, entity_id, name, snippet}`
- Small glass pill/tag displayed below assistant messages
- Shows: entity type icon + entity name
  - device → ApiOutlined
  - couple → LinkOutlined
  - pair → SwapOutlined
  - error_log → WarningOutlined
  - personnel → UserOutlined
  - default → FileOutlined
- Click → navigate to entity detail page:
  - device → `/devices/{entity_id}`
  - couple → `/couples/{entity_id}`
  - pair → `/pairs/{entity_id}`
  - error_log → `/troubleshooting`
  - personnel → (no dedicated page, do nothing or navigate to search)
- Tooltip on hover: shows snippet
- Style: `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 4px 12px;`

---

### MODIFIED FILES

**`main.py`** — Full replacement. Keep ALL existing 16 router includes and add 1 new:
```python
from modules.ai_assistant.router import router as ai_router
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Assistant"])
```

**`migrations/env.py`** — Full replacement. Keep ALL existing model imports and add:
```python
from modules.ai_assistant.models import ChatSession, ChatMessage, EmbeddingDocument
```

**`requirements.txt`** — Full replacement. Keep ALL existing packages and add:
```
pgvector>=0.3.0
```
If `pgvector` is already present, keep it. Make sure `httpx` is also present (it should be from the original requirements).

**`routes.tsx`** — Full replacement. Replace PlaceholderPage for `/ai` with:
```typescript
import AIChatPage from '@/modules/ai_chat/pages/AIChatPage';
```
Keep `/location-history` and `/settings` as PlaceholderPage.

**`nginx/default.conf`** — Full replacement. Add SSE support:
- For the `/api/` location block, add:
```nginx
proxy_buffering off;          # Required for SSE
proxy_cache off;              # No caching for SSE
proxy_set_header X-Accel-Buffering no;
```
Keep all existing config (proxy headers, timeouts, client_max_body_size, gzip, etc.).

---

## VERIFICATION STEPS

1. **Rebuild:**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

2. **Run migration:**
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "add_ai_tables"
   docker compose exec backend alembic upgrade head
   ```

3. **Verify tables created:**
   ```bash
   docker compose exec db psql -U navdashboard -d navdashboard -c "\dt"
   # Should show: chat_sessions, chat_messages, embedding_documents (new)
   ```

4. **Get token:**
   ```bash
   TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@navdashboard.com","password":"admin123"}' | jq -r .access_token)
   ```

5. **Test AI health (Ollama check):**
   ```bash
   curl -s http://localhost/api/v1/ai/health \
     -H "Authorization: Bearer $TOKEN" | jq .
   # If Ollama running: {"available": true, "models": ["llama3", "nomic-embed-text", ...]}
   # If Ollama not running: {"available": false, "error": "..."}
   ```

6. **Test ingest status:**
   ```bash
   curl -s http://localhost/api/v1/ai/ingest/status \
     -H "Authorization: Bearer $TOKEN" | jq .
   ```

7. **Test embedding sync (only if Ollama running):**
   ```bash
   curl -s -X POST http://localhost/api/v1/ai/ingest \
     -H "Authorization: Bearer $TOKEN" | jq .
   # Should show: {"total_synced": N, "by_type": {...}}
   ```

8. **Test chat (non-streaming):**
   ```bash
   curl -s -X POST http://localhost/api/v1/ai/chat \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content": "What devices are currently faulty?"}' | jq .
   ```

9. **Test chat (streaming):**
   ```bash
   curl -N -X POST http://localhost/api/v1/ai/chat/stream \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content": "List all pairs and their status"}'
   # Should see SSE events streaming in
   ```

10. **Test sessions:**
    ```bash
    curl -s http://localhost/api/v1/ai/sessions \
      -H "Authorization: Bearer $TOKEN" | jq .
    ```

11. **Test frontend:**
    - Navigate to `/ai`
    - If Ollama running: see "AI Ready" indicator, click suggested query, see streaming response with sources
    - If Ollama NOT running: see "AI Offline" indicator, sending message returns clear unavailability message
    - Create multiple sessions, switch between them
    - Delete a session

12. **Test graceful degradation (if Ollama not running):**
    - `/ai` page loads without errors
    - Sessions list works
    - Sending message returns polite "unavailable" message
    - Ingest status shows `ollama_available: false`
    - No 500 errors anywhere

13. **Verify existing features:**
    - `/devices`, `/couples`, `/pairs`, `/map`, `/troubleshooting`, `/search`, `/audit`, `/comparison`, `/documents`, `/backup`, `/reports` all still work

---

## RULES REMINDER

- ✅ Generate ALL 22 files listed — complete contents, no abbreviation
- ✅ Use exact color hex values from the palette
- ✅ Use default imports for shared components: `import GlassCard from '...'`
- ✅ main.py: keep ALL 16 existing router includes + add AI
- ✅ migrations/env.py: keep ALL existing model imports + add 3 new
- ✅ routes.tsx: keep ALL existing routes, replace only `/ai` placeholder
- ✅ Handle Ollama unavailability GRACEFULLY everywhere — no crashes, clear messages
- ✅ pgvector similarity search using raw SQL text queries
- ✅ SSE streaming must work through nginx (proxy_buffering off)
- ✅ Direct httpx calls to Ollama — NO LangChain
- ❌ DO NOT modify any file not listed
- ❌ DO NOT abbreviate with "// ... rest" or "# similar"
- ❌ DO NOT skip any file
- ❌ DO NOT use LangChain or any LLM framework — direct HTTP only
```