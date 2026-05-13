import type { IdeaDetailResponse, IdeaListResponse, EvaluateIdeaRequest, EvaluationStatus } from '@/types/ideas'

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  const body = await res.json().catch(() => ({}))
  const message = body?.detail ?? `HTTP ${res.status}`
  const err: Error & { status?: number } = new Error(
    typeof message === 'string' ? message : JSON.stringify(message)
  )
  ;(err as any).status = res.status
  throw err
}

export async function submitIdea(data: FormData): Promise<IdeaDetailResponse> {
  const res = await fetch('/api/v1/ideas', {
    method: 'POST',
    credentials: 'include',
    body: data,
  })
  return handleResponse<IdeaDetailResponse>(res)
}

export async function listIdeas(page = 1, limit = 20, mine = false, status?: EvaluationStatus): Promise<IdeaListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (mine) params.set('mine', 'true')
  if (status) params.set('status', status)
  const res = await fetch(`/api/v1/ideas?${params}`, { credentials: 'include' })
  return handleResponse<IdeaListResponse>(res)
}

export async function evaluateIdea(id: string, payload: EvaluateIdeaRequest): Promise<IdeaDetailResponse> {
  const res = await fetch(`/api/v1/ideas/${id}/evaluate`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse<IdeaDetailResponse>(res)
}

export async function getIdea(id: string): Promise<IdeaDetailResponse> {
  const res = await fetch(`/api/v1/ideas/${id}`, { credentials: 'include' })
  return handleResponse<IdeaDetailResponse>(res)
}
