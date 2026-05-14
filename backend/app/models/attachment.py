from sqlalchemy import Column, String, Integer, Index, ForeignKey
from app.models.user import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id          = Column(String, primary_key=True)
    idea_id     = Column(String, ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False)
    filename    = Column(String, nullable=False)
    stored_name = Column(String, nullable=False)
    mime_type   = Column(String, nullable=False)
    size        = Column(Integer, nullable=False)
    uploaded_at = Column(String, nullable=False)

    __table_args__ = (
        Index("idx_attachments_idea_id", "idea_id"),
    )
