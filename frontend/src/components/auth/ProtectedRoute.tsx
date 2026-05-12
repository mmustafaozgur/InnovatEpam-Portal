import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function AdminRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md text-center">
          <h2 className="text-xl font-bold font-heading text-primary mb-2">Access Denied</h2>
          <p className="text-gray-600 text-sm">
            You don't have permission to view this page. Admin access is required.
          </p>
        </div>
      </div>
    )
  }
  return <Outlet />
}
