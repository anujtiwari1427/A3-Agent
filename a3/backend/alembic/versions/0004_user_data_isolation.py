"""Add user data isolation indexes and dataset visibility.

Revision ID: 0004_user_data_isolation
Revises: 0003_jobs_and_api_keys
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_user_data_isolation"
down_revision = "0003_jobs_and_api_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add visibility column to datasets
    with op.batch_alter_table("datasets") as batch_op:
        batch_op.add_column(
            sa.Column("visibility", sa.String(length=20), nullable=False, server_default="private")
        )
        batch_op.create_index("ix_datasets_org_uploader", ["org_id", "uploaded_by"])
        batch_op.create_index("ix_datasets_uploaded_by", ["uploaded_by"])

    # 2. Add index on users(org_id)
    with op.batch_alter_table("users") as batch_op:
        batch_op.create_index("ix_users_org_id", ["org_id"])

    # 3. Add indexes on reports
    with op.batch_alter_table("reports") as batch_op:
        batch_op.create_index("ix_reports_created_by", ["created_by"])
        batch_op.create_index("ix_reports_org_created_by", ["org_id", "created_by"])


def downgrade() -> None:
    with op.batch_alter_table("reports") as batch_op:
        batch_op.drop_index("ix_reports_org_created_by")
        batch_op.drop_index("ix_reports_created_by")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_org_id")

    with op.batch_alter_table("datasets") as batch_op:
        batch_op.drop_index("ix_datasets_uploaded_by")
        batch_op.drop_index("ix_datasets_org_uploader")
        batch_op.drop_column("visibility")
