export interface FileInfo {
  name: string
  size: number
  mime_type: string
}

export type EvaluationStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected'

export interface EvaluationInfo {
  status: EvaluationStatus
  comment: string | null
  evaluated_at: string | null
  assigned_admin_id: string | null
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
  file: FileInfo | null
  evaluation: EvaluationInfo
}

export interface IdeaSummaryResponse {
  id: string
  title: string
  category: string
  submitter_name: string
  submitted_at: string
  has_attachment: boolean
  evaluation_status: EvaluationStatus
}

export interface IdeaListResponse {
  ideas: IdeaSummaryResponse[]
  total: number
  page: number
  limit: number
}
