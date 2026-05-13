from sqlalchemy import Column, String, Integer, Index, CheckConstraint, text
from app.models.user import Base


class Idea(Base):
    __tablename__ = "ideas"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    submitter_id = Column(String, nullable=False)
    submitted_at = Column(
        String,
        nullable=False,
        server_default=text("(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))"),
    )
    attachment_filename = Column(String, nullable=True)
    attachment_stored_name = Column(String, nullable=True)
    attachment_mime_type = Column(String, nullable=True)
    attachment_size = Column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "category IN ('process_improvement','technology','cost_saving','other')",
            name="ck_ideas_category",
        ),
        CheckConstraint("length(title) <= 150", name="ck_ideas_title_length"),
        CheckConstraint("length(description) <= 3000", name="ck_ideas_description_length"),
        CheckConstraint(
            "(attachment_filename IS NULL) = (attachment_stored_name IS NULL)",
            name="ck_ideas_attachment_consistency",
        ),
        Index("idx_ideas_submitted_at", "submitted_at"),
        Index("idx_ideas_submitter_id", "submitter_id"),
    )
