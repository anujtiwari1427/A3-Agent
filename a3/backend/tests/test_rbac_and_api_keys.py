"""Tests verifying Role-Based Access Control and API Key management."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.auth import check_role_permission
from app.core.database import Base
from app.models.domain import Org, User, ApiKey
from app.repositories.api_key_repository import ApiKeyRepository, hash_api_key


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org = Org(id="org-1", name="Acme", slug="acme", plan="enterprise")
    user = User(id="user-1", email="admin@acme.com", org_id="org-1", role="admin", is_active=True)
    db.add_all([org, user])
    db.commit()

    yield db
    db.close()


def test_role_hierarchy_permissions():
    assert check_role_permission("owner", "admin") is True
    assert check_role_permission("admin", "analyst") is True
    assert check_role_permission("analyst", "viewer") is True
    assert check_role_permission("viewer", "analyst") is False
    assert check_role_permission("viewer", "admin") is False
    assert check_role_permission("analyst", "admin") is False


def test_api_key_lifecycle(db_session):
    repo = ApiKeyRepository(db_session)

    # 1. Create API key
    key_record, raw_token = repo.create(
        org_id="org-1",
        user_id="user-1",
        name="Production CI Pipeline",
        role="analyst",
    )

    assert raw_token.startswith("a3_live_")
    assert key_record.key_prefix == raw_token[:12]
    assert key_record.key_hash == hash_api_key(raw_token)
    assert key_record.is_active is True

    # 2. Look up by hash
    found = repo.get_by_hash(hash_api_key(raw_token))
    assert found is not None
    assert found.id == key_record.id

    # 3. Revocation
    revoked = repo.revoke(key_record.id, org_id="org-1")
    assert revoked is True

    # 4. Inactive key cannot be retrieved by active hash lookup
    found_after_revoke = repo.get_by_hash(hash_api_key(raw_token))
    assert found_after_revoke is None
