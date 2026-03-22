

## TECHNICAL REPORT — Phase 12: AI Assistant

### 1. Files Created/Modified — 24 total

**New files created (19):**
| # | File | Purpose |
|---|------|---------|
| 1 | `backend/modules/ai_assistant/__init__.py` | Module init |
| 2 | `backend/modules/ai_assistant/models.py` | ChatSession, ChatMessage, EmbeddingDocument (pgvector) |
| 3 | `backend/modules/ai_assistant/schemas.py` | Pydantic models for API I/O |
| 4 | `backend/modules/ai_assistant/repository.py` | DB CRUD for sessions, messages, embeddings |
| 5 | `backend/modules/ai_assistant/service.py` | Business logic orchestration |
| 6 | `backend/modules/ai_assistant/router.py` | 8 API endpoints under `/api/v1/ai` |
| 7 | `backend/modules/ai_assistant/embeddings.py` | Ollama embedding API + pgvector storage + sync |
| 8 | `backend/modules/ai_assistant/retriever.py` | Vector search, structured search, hybrid RAG retrieval |
| 9 | `backend/modules/ai_assistant/prompts.py` | System prompt, classification prompt, fallback messages |
| 10 | `backend/modules/ai_assistant/chain.py` | RAG orchestrator: retrieve → prompt → Ollama → response |
| 11 | `backend/migrations/versions/79b9861e081b_add_ai_tables.py` | Alembic migration for 3 new tables |
| 12 | `database/Dockerfile` | Custom PostgreSQL image with pgvector compiled from source |
| 13 | `frontend/src/modules/ai_chat/pages/AIChatPage.tsx` | Two-panel chat interface |
| 14 | `frontend/src/modules/ai_chat/components/ChatWindow.tsx` | Message list + streaming + auto-scroll |
| 15 | `frontend/src/modules/ai_chat/components/ChatMessage.tsx` | User/assistant bubbles with markdown rendering |
| 16 | `frontend/src/modules/ai_chat/components/ChatInput.tsx` | Auto-growing textarea with Enter-to-send |
| 17 | `frontend/src/modules/ai_chat/components/SuggestedQueries.tsx` | 6-card welcome screen with pre-built queries |
| 18 | `frontend/src/modules/ai_chat/components/SourceReference.tsx` | Clickable entity pills with navigation |
| 19 | `frontend/src/modules/ai_chat/hooks/useAIChat.ts` | React Query hooks + SSE streaming hook |

**Modified files (5):**
| # | File | Change |
|---|------|--------|
| 20 | `backend/core/config.py` | Added 4 OLLAMA settings |
| 21 | `backend/main.py` | Added ai_router (17th router), version → 0.12.0 |
| 22 | `backend/migrations/env.py` | Added ChatSession, ChatMessage, EmbeddingDocument imports |
| 23 | `backend/requirements.txt` | Added `pgvector>=0.3.0`, `httpx>=0.27.0` |
| 24 | `frontend/src/app/routes.tsx` | Replaced `/ai` PlaceholderPage with AIChatPage |
| 25 | `nginx/default.conf` | Added `proxy_buffering off`, `proxy_cache off`, `X-Accel-Buffering no` for SSE |
| 26 | `docker-compose.yml` | DB switched to custom build, added `extra_hosts` for backend |

---

### 2. API Surface — 8 New Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/ai/chat` | Send message, get full RAG response |
| `POST` | `/api/v1/ai/chat/stream` | Send message, get SSE-streamed response |
| `GET` | `/api/v1/ai/sessions` | List user's chat sessions |
| `GET` | `/api/v1/ai/sessions/{id}` | Get session detail with messages |
| `DELETE` | `/api/v1/ai/sessions/{id}` | Delete a chat session |
| `POST` | `/api/v1/ai/ingest` | Trigger full embedding sync |
| `GET` | `/api/v1/ai/ingest/status` | Get sync status + Ollama health |
| `GET` | `/api/v1/ai/health` | Check Ollama connectivity |

**Total API endpoints now: 16 modules × ~5 avg + 8 AI = ~88 endpoints**

---

### 3. Database Changes — 3 New Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| `chat_sessions` | id, user_id (FK→users), title, created_at, updated_at, deleted_at | Conversation containers |
| `chat_messages` | id, session_id (FK→chat_sessions, CASCADE), role, content, sources (JSONB), token_count | Individual messages |
| `embedding_documents` | id, content, source_type, source_id, embedding (Vector(768)), metadata_json | pgvector RAG store |

**PostgreSQL extensions now active: postgis, uuid-ossp, vector, pg_trgm, btree_gin**

---

### 4. RAG Pipeline Architecture

```
User Query → Hybrid Retrieve → Build Context → Ollama Chat → Response
                │                                    │
                ├─ Vector Search (pgvector cosine)   ├─ Streaming (SSE)
                └─ Structured Search (ILIKE)         └─ Non-streaming (JSON)
```

- **Embedding model:** nomic-embed-text (768 dimensions)
- **Chat model:** llama3.2:3b (configurable via .env)
- **No LangChain** — direct httpx calls to Ollama HTTP API
- **Graceful degradation:** All endpoints return clear messages when Ollama is unavailable

---

### 5. Frontend Components

| Component | Features |
|-----------|----------|
| `AIChatPage` | Two-panel layout: session sidebar (280px) + chat area |
| `ChatWindow` | Auto-scrolling message list, streaming support |
| `ChatMessage` | Markdown rendering (bold, italic, code, lists, headers), source pills |
| `ChatInput` | Auto-growing textarea, Enter/Shift+Enter, disabled during streaming |
| `SuggestedQueries` | 6-card grid with pre-built LiFi domain queries |
| `SourceReference` | Clickable pills navigating to /devices/:id, /couples/:id, etc. |
| `useAIChat` | 7 hooks including SSE streaming via fetch ReadableStream |

---

### 6. Issues Encountered and Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Alembic "not up to date" | Duplicate rows in `alembic_version` table (both `aa51cc41dd6d` and `aa477f490651`) | Cleaned table, inserted single head |
| `pgvector` not defined in migration | Autogenerated migration referenced `pgvector.sqlalchemy.vector.VECTOR` without import | Added `from pgvector.sqlalchemy import Vector` to migration file |
| `type "vector" does not exist` | `imresamu/postgis:16-3.5` image doesn't include pgvector | Created custom `database/Dockerfile` compiling pgvector v0.8.0 from source |
| SQL syntax error on vector search | `::vector` cast syntax conflicted with SQLAlchemy named parameters | Changed to `cast(:query_vec as vector)` syntax |
| Ollama chat "error generating response" | Config had `OLLAMA_MODEL=llama3` but installed model is `llama3.2:3b` | Updated `backend/.env` to `OLLAMA_MODEL=llama3.2:3b` |
| `DISTINCT ON` PostgreSQL error | Repository subquery used `DISTINCT ON (session_id)` without matching leading ORDER BY | Added `session_id` to ORDER BY before `created_at DESC` |
| `.env` corruption | Multiple `sed` runs duplicated OLLAMA config lines | Rewrote `.env` cleanly |
| Container not picking up .env changes | `docker compose restart` doesn't re-read `env_file` | Used `docker compose up -d backend --force-recreate` |

---

### 7. Embedding Sync Results

Successfully indexed **72 documents** from the existing database:

| Source Type | Count |
|-------------|-------|
| Devices | 9 |
| Couples | 5 |
| Pairs | 2 |
| Error Logs | 6 |
| Troubleshoot Entries | 10 |
| Personnel | 6 |
| Fitting Materials | 24 |
| Location History | 10 |

---

### 8. Graceful Degradation (Oracle Cloud Compatibility)

When Ollama is **not available**:
- ✅ `/ai/health` returns `{"available": false, "error": "Ollama is not running..."}`
- ✅ `/ai/ingest/status` returns `{"ollama_available": false}` — sessions still list
- ✅ `/ai/chat` returns friendly message with setup instructions
- ✅ `/ai/sessions` works normally (DB only, no Ollama needed)
- ✅ Frontend shows "AI Offline" red indicator, disables Sync button
- ✅ No 500 errors anywhere

---

### 9. Infrastructure Changes

- **Docker image:** `db` service switched from `image: imresamu/postgis:16-3.5` to `build: context: ./database` (custom Dockerfile)
- **Backend networking:** Added `extra_hosts: ["host.docker.internal:host-gateway"]` for reliable Ollama access
- **Nginx:** Added SSE support headers (`proxy_buffering off`, `proxy_cache off`)
- **Dependencies:** Added `pgvector>=0.3.0` and `httpx>=0.27.0` to requirements.txt

---

### 10. Current System State

| Metric | Value |
|--------|-------|
| Backend modules | **17** (16 existing + 1 AI) |
| Database tables | **19** (16 existing + 3 AI) |
| Docker services | **6** (nginx, frontend, backend, db, redis, minio) |
| Frontend routes | **19** (17 active + 2 placeholders) |
| API version | 0.12.0 |
| Remaining placeholders | `/location-history`, `/settings` (Phase 13) |