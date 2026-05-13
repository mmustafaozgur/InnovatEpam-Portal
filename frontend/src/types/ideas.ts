export interface FileInfo {
  name: string
  size: number
  mime_type: string
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
}

export interface IdeaSummaryResponse {
  id: string
  title: string
  category: string
  submitter_name: string
  submitted_at: string
  has_attachment: boolean
}

export interface IdeaListResponse {
  ideas: IdeaSummaryResponse[]
  total: number
  page: number
  limit: number
}
