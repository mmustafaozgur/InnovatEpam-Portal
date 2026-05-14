from sqlalchemy import Column, String, Index, CheckConstraint
from app.models.user import Base


class StageReview(Base):
    __tablename__ = "stage_reviews"

    id = Column(String, primary_key=True)
    idea_id = Column(String, nullable=False)
    stage = Column(String, nullable=False)
    outcome = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(String, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "stage IN ('new_idea','initial_screening','technical_review',"
            "'business_impact_assessment','final_selection')",
            name="ck_stage_reviews_stage",
        ),
        CheckConstraint(
            "outcome IS NULL OR outcome IN ('accepted','rejected')",
            name="ck_stage_reviews_outcome",
        ),
        CheckConstraint(
            "comment IS NULL OR length(comment) <= 1000",
            name="ck_stage_reviews_comment_length",
        ),
        Index("idx_stage_reviews_idea_id", "idea_id"),
    )
