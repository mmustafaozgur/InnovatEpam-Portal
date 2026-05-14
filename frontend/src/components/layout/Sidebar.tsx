import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Lightbulb, PlusCircle, Users, User, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/',        label: 'Home',           icon: Home,        roles: ['submitter', 'admin'] },
  { to: '/ideas',   label: 'Ideas',          icon: Lightbulb,   roles: ['submitter', 'admin'] },
  { to: '/submit',  label: 'Submit an Idea', icon: PlusCircle,  roles: ['submitter'] },
  { to: '/users',   label: 'Manage Users',   icon: Users,       roles: ['admin'] },
  { to: '/profile', label: 'My Profile',     icon: User,        roles: ['submitter', 'admin'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-white rounded-lg p-2 shadow-md border border-border cursor-pointer"
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen
          ? <X className="w-5 h-5 text-slate-600" aria-hidden="true" />
          : <Menu className="w-5 h-5 text-slate-600" aria-hidden="true" />}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          data-testid="mobile-backdrop"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen w-[220px] bg-white border-r border-border',
          'flex flex-col z-40 shadow-sm transition-transform duration-300',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="px-6 py-5 border-b border-border">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="font-heading font-bold text-lg text-primary leading-none"
          >
            InnovatEpam
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-1" aria-label="Main navigation">
          {NAV_ITEMS
            .filter(item => item.roles.includes(user?.role ?? ''))
            .map(item => {
              const active =
                pathname === item.to ||
                (item.to !== '/' && pathname.startsWith(item.to))
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    'transition-all duration-200 cursor-pointer',
                    active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-slate-500 hover:text-primary hover:bg-primary/5'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm" aria-hidden="true">
                {user?.full_name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700 truncate leading-tight">
                {user?.full_name}
              </p>
              <Badge variant={user?.role === 'admin' ? 'admin' : 'submitter'} className="mt-1">
                {user?.role}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
