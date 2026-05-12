import { useState } from 'react'
import type { User } from '@/types/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { promoteUser } from '@/api/auth'

interface UserTableProps {
  users: User[]
  currentUser: User
  onRefresh: () => void
}

export default function UserTable({ users, currentUser, onRefresh }: UserTableProps) {
  const [promoting, setPromoting] = useState<string | null>(null)

  const handlePromote = async (userId: string) => {
    setPromoting(userId)
    try {
      await promoteUser(userId)
      onRefresh()
    } finally {
      setPromoting(null)
    }
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'admin' : 'submitter'}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {(user as any).created_at
                  ? new Date((user as any).created_at).toLocaleDateString()
                  : '—'}
              </TableCell>
              <TableCell>
                {user.role === 'submitter' && user.id !== currentUser.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePromote(user.id)}
                    disabled={promoting === user.id}
                  >
                    {promoting === user.id ? 'Promoting…' : 'Promote to Admin'}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
