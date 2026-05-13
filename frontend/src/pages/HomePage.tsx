import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold font-heading text-primary">InnovatEpam Portal</h1>
        <div className="flex items-center gap-4">
          {user?.role === 'admin' && (
            <Link
              to="/users"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage Users
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-md p-8 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold font-heading text-primary">
              Welcome, {user?.full_name}
            </h2>
            <Badge variant={user?.role === 'admin' ? 'admin' : 'submitter'}>
              {user?.role}
            </Badge>
          </div>
          <p className="text-gray-600 text-sm">
            You are signed in as <strong>{user?.email}</strong>.
          </p>
        </div>
      </main>
    </div>
  )
}
