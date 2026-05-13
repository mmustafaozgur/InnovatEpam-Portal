import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="bg-white rounded-xl shadow-md p-8 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold font-heading text-primary">
            Welcome, {user?.full_name}
          </h2>
          <Badge variant={user?.role === 'admin' ? 'admin' : 'submitter'}>
            {user?.role}
          </Badge>
        </div>
        <p className="text-gray-600 text-sm">
          Signed in as <strong>{user?.email}</strong>
        </p>
        <div className="flex gap-3 flex-wrap pt-2">
          <Button asChild variant="default">
            <Link to="/ideas">Browse Ideas</Link>
          </Button>
          {user?.role === 'submitter' && (
            <Button asChild variant="outline">
              <Link to="/submit">Submit an Idea</Link>
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button asChild variant="outline">
              <Link to="/users">Manage Users</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
