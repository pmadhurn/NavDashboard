-- Enable required PostgreSQL extensions
-- Runs once on first container initialization
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- trigram for full-text search
CREATE EXTENSION IF NOT EXISTS btree_gin;     -- for GIN indexes