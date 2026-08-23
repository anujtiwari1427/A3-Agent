"""Pydantic schemas for API Key Management."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    role: str = Field(default="analyst")
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=365)


class ApiKeyCreatedResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    role: str
    raw_key: str
    is_active: bool
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
