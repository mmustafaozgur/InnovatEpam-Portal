export type Role = 'admin' | 'submitter'

export interface User {
  id: string
  full_name: string
  email: string
  role: Role
}

export interface AuthState {
  user: User | null
  isLoading: boolean
}
