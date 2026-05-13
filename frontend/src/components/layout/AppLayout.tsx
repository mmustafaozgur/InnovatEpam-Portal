import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link
      to={to}
      className={cn(
        'text-sm font-medium transition-colors',
        active ? 'text-primary' : 'text-gray-500 hover:text-primary'
      )}
    >
      {children}
    </Link>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold font-heading text-primary">
            InnovatEpam Portal
          </Link>
          <NavLink to="/ideas">Ideas</NavLink>
          {user?.role === 'submitter' && (
            <NavLink to="/submit">Submit an Idea</NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/users">Manage Users</NavLink>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:inline">{user?.full_name}</span>
          <Badge variant={user?.role === 'admin' ? 'admin' : 'submitter'}>
            {user?.role}
          </Badge>
          <Button variant="outline" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
