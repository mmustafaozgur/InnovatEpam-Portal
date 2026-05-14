export interface AttachmentInfo {
  id: string
  name: string
  size: number
  mime_type: string
  is_image: boolean
}

export type Stage =
  | 'new_idea'
  | 'initial_screening'
  | 'technical_review'
  | 'business_impact_assessment'
  | 'final_selection'

export type Outcome = 'accepted' | 'rejected'

export interface StageReviewRecord {
  id: string
  stage: Stage
  outcome: Outcome | null
  comment: string | null
  reviewer_name: string | null
  reviewed_at: string
}

export interface AdvanceStageRequest {
  comment?: string | null
  outcome?: Outcome | null
}

export interface IdeaDetailResponse {
  id: string
  title: string
  description: string
  category: string
  submitter_id: string
  submitter_name: string
  submitted_at: string
  attachments: AttachmentInfo[]
  current_stage: Stage
  assigned_admin_id: string | null
  assigned_admin_name: string | null
  stage_reviews: StageReviewRecord[]
  extra_data: Record<string, unknown> | null
}

export interface IdeaSummaryResponse {
  id: string
  title: string
  category: string
  submitter_name: string
  submitted_at: string
  attachment_count: number
  current_stage: Stage
  outcome: Outcome | null
  reviewer_name: string | null
  extra_data: Record<string, unknown> | null
}

export interface IdeaListResponse {
  ideas: IdeaSummaryResponse[]
  total: number
  page: number
  limit: number
}
