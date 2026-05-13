import type { IdeaDetailResponse, IdeaListResponse } from '@/types/ideas'

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

export async function listIdeas(page = 1, limit = 20, mine = false): Promise<IdeaListResponse> {
  const mineParam = mine ? '&mine=true' : ''
  const res = await fetch(`/api/v1/ideas?page=${page}&limit=${limit}${mineParam}`, {
    credentials: 'include',
  })
  return handleResponse<IdeaListResponse>(res)
}

export async function getIdea(id: string): Promise<IdeaDetailResponse> {
  const res = await fetch(`/api/v1/ideas/${id}`, { credentials: 'include' })
  return handleResponse<IdeaDetailResponse>(res)
}
