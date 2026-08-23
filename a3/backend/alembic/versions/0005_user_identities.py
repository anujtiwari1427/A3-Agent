"""Add user_identities table for OAuth providers.

Revision ID: 0005_user_identities
Revises: 0004_user_data_isolation
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_user_identities"
down_revision = "0004_user_data_isolation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_identities",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("provider_subject", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("user_identities") as batch_op:
        batch_op.create_index("ix_user_identities_user_id", ["user_id"])
        batch_op.create_index(
            "ix_user_identities_provider_sub",
            ["provider", "provider_subject"],
            unique=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("user_identities") as batch_op:
        batch_op.drop_index("ix_user_identities_provider_sub")
        batch_op.drop_index("ix_user_identities_user_id")
    op.drop_table("user_identities")
