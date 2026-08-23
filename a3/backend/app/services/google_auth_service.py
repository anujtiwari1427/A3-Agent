"""Google Identity Services and OAuth 2.0 verification and account linking service."""

import json
import time
import urllib.parse
import urllib.request
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session as DBSession

from ..core.config import settings
from ..models.domain import Org, User, UserIdentity
from ..services.audit_service import record_audit


def verify_google_token(credential: str) -> Dict[str, Any]:
    """
    Verify Google ID Token via Google's tokeninfo API.
    Validates issuer, expiration, audience, subject, and email verification.
    """
    if not credential or not credential.strip():
        raise ValueError("Missing Google credential")

    token = credential.strip()

    # Google tokeninfo endpoint
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(token)}"

    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "A3-Agent-OAuth-Verifier/2.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status != 200:
                raise ValueError("Google token verification failed with status " + str(response.status))
            body = response.read().decode("utf-8")
            data = json.loads(body)
    except Exception as e:
        raise ValueError(f"Failed to verify Google token: {str(e)}")

    # 1. Validate Issuer
    issuer = data.get("iss", "")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError(f"Invalid Google token issuer: '{issuer}'")

    # 2. Validate Expiration
    exp = int(data.get("exp", 0))
    if exp < int(time.time()):
        raise ValueError("Google token has expired")

    # 3. Validate Audience (Client ID) if configured
    if settings.GOOGLE_CLIENT_ID:
        aud = data.get("aud", "")
        if aud != settings.GOOGLE_CLIENT_ID:
            raise ValueError(f"Google token audience mismatch. Expected '{settings.GOOGLE_CLIENT_ID}', got '{aud}'")

    # 4. Validate Subject (sub)
    sub = data.get("sub")
    if not sub:
        raise ValueError("Google token missing subject ('sub') identifier")

    # 5. Validate Email and Email Verification
    email = data.get("email")
    if not email:
        raise ValueError("Google token missing email claim")

    email_verified = data.get("email_verified")
    if email_verified not in (True, "true", "True", 1):
        raise ValueError("Google email is not verified by Google")

    return {
        "sub": str(sub),
        "email": str(email).lower().strip(),
        "name": data.get("name") or data.get("given_name") or email.split("@")[0],
        "picture": data.get("picture"),
        "email_verified": True,
    }


def authenticate_or_register_google_user(
    db: DBSession,
    google_profile: Dict[str, Any],
) -> User:
    """
    Authenticate or provision a user from verified Google profile:
    1. Search UserIdentity for provider='google' and provider_subject=google_profile['sub'].
    2. If found -> return user.
    3. If not found, search User by verified email:
       - If found -> link Google UserIdentity to existing user.
       - If not found -> provision new User + dedicated Personal Workspace Org + UserIdentity.
    """
    provider = "google"
    provider_subject = google_profile["sub"]
    email = google_profile["email"]
    name = google_profile.get("name")

    # 1. Existing identity lookup
    identity = (
        db.query(UserIdentity)
        .filter(
            UserIdentity.provider == provider,
            UserIdentity.provider_subject == provider_subject,
        )
        .first()
    )

    if identity:
        user = db.query(User).filter(User.id == identity.user_id).first()
        if not user or not user.is_active:
            raise ValueError("User account is disabled")
        record_audit(
            db,
            org_id=user.org_id,
            user_id=user.id,
            action="user.google_login",
            resource_type="auth_session",
            resource_id=user.id,
        )
        db.commit()
        return user

    # 2. Account linking for verified email
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        if not existing_user.is_active:
            raise ValueError("User account is disabled")

        new_identity = UserIdentity(
            id=str(uuid.uuid4()),
            user_id=existing_user.id,
            provider=provider,
            provider_subject=provider_subject,
        )
        db.add(new_identity)
        record_audit(
            db,
            org_id=existing_user.org_id,
            user_id=existing_user.id,
            action="user.account_linked",
            resource_type="user_identity",
            resource_id=new_identity.id,
            metadata={"provider": provider},
        )
        db.commit()
        db.refresh(existing_user)
        return existing_user

    # 3. New User + Dedicated Personal Workspace Provisioning
    workspace_suffix = uuid.uuid4().hex[:8]
    workspace_slug = f"ws-{workspace_suffix}"
    workspace_name = f"{name or email.split('@')[0]}'s Workspace"

    org = Org(
        id=str(uuid.uuid4()),
        name=workspace_name,
        slug=workspace_slug,
        plan="personal" if settings.MODE == "local" else "free",
    )
    db.add(org)
    db.flush()

    user = User(
        id=str(uuid.uuid4()),
        email=email,
        full_name=name,
        role="owner",
        org_id=org.id,
        is_active=True,
    )
    db.add(user)
    db.flush()

    new_identity = UserIdentity(
        id=str(uuid.uuid4()),
        user_id=user.id,
        provider=provider,
        provider_subject=provider_subject,
    )
    db.add(new_identity)

    record_audit(
        db,
        org_id=user.org_id,
        user_id=user.id,
        action="user.google_registered",
        resource_type="user",
        resource_id=user.id,
    )
    db.commit()
    db.refresh(user)
    return user
