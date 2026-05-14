from sqlalchemy import Column, String, Index, CheckConstraint, text
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

    # Stage pipeline (Feature 007)
    current_stage = Column(
        String,
        nullable=False,
        default="new_idea",
        server_default="new_idea",
    )
    assigned_admin_id = Column(String, nullable=True)

    # Legacy evaluation columns — kept for migration compatibility; dropped by migrate_stage_reviews.py
    evaluation_status = Column(
        String, nullable=False, default="submitted", server_default="submitted"
    )
    evaluation_comment = Column(String, nullable=True)
    evaluated_at = Column(String, nullable=True)

    extra_data = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "category IN ('process_improvement','technology','cost_saving',"
            "'talent_development','client_delivery','workplace_culture','other')",
            name="ck_ideas_category",
        ),
        CheckConstraint("length(title) <= 150", name="ck_ideas_title_length"),
        CheckConstraint("length(description) <= 3000", name="ck_ideas_description_length"),
        CheckConstraint(
            "current_stage IN ('new_idea','initial_screening','technical_review',"
            "'business_impact_assessment','final_selection')",
            name="ck_ideas_current_stage",
        ),
        CheckConstraint(
            "evaluation_status IN ('submitted','under_review','accepted','rejected')",
            name="ck_ideas_evaluation_status",
        ),
        Index("idx_ideas_submitted_at", "submitted_at"),
        Index("idx_ideas_submitter_id", "submitter_id"),
        Index("idx_ideas_current_stage", "current_stage"),
        Index("idx_ideas_evaluation_status", "evaluation_status"),
    )
