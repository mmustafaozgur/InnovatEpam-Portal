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
    <div className="px-6 py-8">
      <h1 className="font-heading font-semibold text-xl text-primary mb-6">User Management</h1>
      {isLoading ? (
        <div className="flex justify-center py-12" role="status">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <UserTable users={users} currentUser={currentUser} onRefresh={fetchUsers} />
      )}
    </div>
  )
}
