import type { User } from '@/types/auth'

interface RegisterRequest {
  full_name: string
  email: string
  password: string
  privacy_policy_accepted: boolean
}

interface LoginRequest {
  email: string
  password: string
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  const body = await res.json().catch(() => ({}))
  const message = body?.detail ?? `HTTP ${res.status}`
  const err: Error & { status?: number; message: string } = new Error(
    typeof message === 'string' ? message : JSON.stringify(message)
  )
  ;(err as any).status = res.status
  throw err
}

export async function register(data: RegisterRequest): Promise<User> {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse<User>(res)
}

export async function login(data: LoginRequest): Promise<User> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return handleResponse<User>(res)
}

export async function logout(): Promise<void> {
  await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
}

export async function getMe(): Promise<User | null> {
  const res = await fetch('/api/v1/auth/me', { credentials: 'include' })
  if (res.status === 401) return null
  return handleResponse<User>(res)
}

export async function listUsers(): Promise<User[]> {
  const res = await fetch('/api/v1/users', { credentials: 'include' })
  const data = await handleResponse<{ users: User[] }>(res)
  return data.users
}

export async function promoteUser(userId: string): Promise<User> {
  const res = await fetch(`/api/v1/users/${userId}/promote`, {
    method: 'PATCH',
    credentials: 'include',
  })
  return handleResponse<User>(res)
}
