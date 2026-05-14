import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json()
        return null
      })
      .then((data) => {
        setUser(data ?? null)
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback((u: User) => setUser(u), [])
  const updateUser = useCallback((u: User) => setUser(u), [])

  const logout = useCallback(async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
