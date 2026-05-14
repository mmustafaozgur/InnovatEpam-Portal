export interface AttachmentInfo {
  id: string
  name: string
  size: number
  mime_type: string
  is_image: boolean
}

export type EvaluationStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected'

export interface EvaluationInfo {
  status: EvaluationStatus
  comment: string | null
  evaluated_at: string | null
  assigned_admin_id: string | null
  assigned_admin_name: string | null
}

export interface EvaluateIdeaRequest {
  status: EvaluationStatus
  comment?: string
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
  evaluation: EvaluationInfo
  extra_data: Record<string, unknown> | null
}

export interface IdeaSummaryResponse {
  id: string
  title: string
  category: string
  submitter_name: string
  submitted_at: string
  attachment_count: number
  evaluation_status: EvaluationStatus
  reviewer_name: string | null
  extra_data: Record<string, unknown> | null
}

export interface IdeaListResponse {
  ideas: IdeaSummaryResponse[]
  total: number
  page: number
  limit: number
}
