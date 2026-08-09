from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    POSTGRES_USER: str = "navdashboard"
    POSTGRES_PASSWORD: str = "navdashboard_secret"
    POSTGRES_DB: str = "navdashboard_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT (defined now, used in Phase 2)
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440

    # App
    ENVIRONMENT: str = "development"
    APP_NAME: str = "NavDashboard"
    API_V1_PREFIX: str = "/api/v1"

    # Comma-separated list of allowed browser origins. `*` is fine for local
    # development, but it is NOT valid alongside credentialed requests — see
    # cors_origins below. Set this to the real origin in production, e.g.
    # CORS_ORIGINS=https://navdashboard.com,https://www.navdashboard.com
    CORS_ORIGINS: str = "*"

    # Google sign-in
    GOOGLE_CLIENT_ID: str = ""

    # Clerk — identity only. Blank disables /auth/clerk entirely.
    # CLERK_ISSUER looks like https://<slug>.clerk.accounts.dev
    CLERK_ISSUER: str = ""
    CLERK_JWKS_URL: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    # Optional. Only needed when the session token has no email claim.
    CLERK_SECRET_KEY: str = ""

    # Ollama / AI Assistant
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "llama3"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    OLLAMA_EMBED_DIMENSION: int = 768

    @property
    def async_database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def cors_allow_credentials(self) -> bool:
        """Browsers reject `Access-Control-Allow-Origin: *` together with
        credentials, so the wildcard and credentials can never both apply.
        Auth currently rides in an Authorization header rather than a cookie,
        which is why the old hardcoded `["*"] + allow_credentials=True` worked
        at all — it would break the moment anything cookie-based was added."""
        return "*" not in self.cors_origins


settings = Settings()