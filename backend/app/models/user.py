from sqlalchemy import Column, String, Integer, Index, CheckConstraint
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    privacy_policy_accepted = Column(Integer, nullable=False, default=0)
    created_at = Column(
        String,
        nullable=False,
        server_default="(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
    )

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'submitter')", name="ck_users_role"),
        Index("idx_users_email", "email"),
    )
