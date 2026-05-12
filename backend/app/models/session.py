from sqlalchemy import Column, String, ForeignKey, Index
from app.models.user import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, nullable=False, unique=True)
    expiry_time = Column(String, nullable=False)
    created_at = Column(
        String,
        nullable=False,
        server_default="(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
    )

    __table_args__ = (
        Index("idx_sessions_token", "token"),
        Index("idx_sessions_expiry", "expiry_time"),
        Index("idx_sessions_user_id", "user_id"),
    )
