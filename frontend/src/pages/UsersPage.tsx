import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { listUsers } from '@/api/auth'
import type { User } from '@/types/auth'
import UserTable from '@/components/users/UserTable'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await listUsers()
      setUsers(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold font-heading text-primary">InnovatEpam Portal — User Management</h1>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold font-heading text-primary mb-6">All Users</h2>
        {isLoading ? (
          <div className="flex justify-center py-12" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <UserTable users={users} currentUser={currentUser} onRefresh={fetchUsers} />
        )}
      </main>
    </div>
  )
}
