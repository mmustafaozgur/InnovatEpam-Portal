import type { IdeaDetailResponse, IdeaListResponse, EvaluateIdeaRequest, EvaluationStatus } from '@/types/ideas'
import { CATEGORY_FIELD_SCHEMA } from '@/components/ideas/categoryFieldSchema'

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  const body = await res.json().catch(() => ({}))
  const message = body?.detail ?? `HTTP ${res.status}`
  const err: Error & { status?: number; detail?: unknown } = new Error(
    typeof message === 'string' ? message : JSON.stringify(message)
  )
  ;(err as any).status = res.status
  ;(err as any).detail = body?.detail
  throw err
}

export async function submitIdea(data: FormData): Promise<IdeaDetailResponse> {
  const category = data.get('category') as string | null

  if (category && category !== 'other') {
    const fields = CATEGORY_FIELD_SCHEMA[category] ?? []
    const extraValues: Record<string, unknown> = {}
    let hasExtraValues = false

    for (const field of fields) {
      const raw = data.get(field.key) as string | null
      if (raw !== null && raw !== undefined) {
        data.delete(field.key)
        if (field.type === 'number') {
          const trimmed = raw.trim()
          extraValues[field.key] = trimmed === '' ? null : Number(trimmed)
        } else {
          extraValues[field.key] = raw === '' ? null : raw
        }
        hasExtraValues = true
      }
    }

    if (hasExtraValues) {
      data.append('extra_data', JSON.stringify(extraValues))
    }
  }

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
