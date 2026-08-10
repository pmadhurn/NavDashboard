from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=100)
    role: str = "VIEWER"


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    custom_fields: Optional[dict] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: str
    role: str
    is_active: bool
    auth_provider: str = "LOCAL"
    status: str = "ACTIVE"
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    custom_fields: Optional[dict] = None
    # Permission KEYS the caller holds. Replaces the old section -> level
    # map: the frontend gates nav items and buttons on these directly.
    permissions: Optional[list[str]] = None

    model_config = {"from_attributes": True}


class PermissionsUpdate(BaseModel):
    """Replaces a user's access: which roles they hold, plus per-user overrides.

    Roles carry the bulk of the grant; an override is how one capability is
    added to or taken away from a single person without cloning a role for them.
    """

    role_ids: list[UUID] = []
    overrides: list[dict] = []


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)


class GoogleLoginRequest(BaseModel):
    credential: str


class GoogleAuthResponse(BaseModel):
    """pending=True means the account was created (or exists) but awaits admin approval."""

    pending: bool = False
    message: Optional[str] = None
    token: Optional[TokenResponse] = None

class ClerkLoginRequest(BaseModel):
    """Clerk session JWT, obtained client-side via getToken()."""

    token: str


class ClerkAuthResponse(BaseModel):
    pending: bool
    message: str | None = None
    access_token: str | None = None
    token_type: str | None = None


class ClerkConfigResponse(BaseModel):
    enabled: bool
    publishable_key: str | None = None
