import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'

const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage'))
const HomePage = React.lazy(() => import('@/pages/HomePage'))
const UsersPage = React.lazy(() => import('@/pages/UsersPage'))
const SubmitIdeaPage = React.lazy(() => import('@/pages/SubmitIdeaPage'))
const IdeasPage = React.lazy(() => import('@/pages/IdeasPage'))
const IdeaDetailPage = React.lazy(() => import('@/pages/IdeaDetailPage'))
const AppLayout = React.lazy(() => import('@/components/layout/AppLayout'))
const ProtectedRoute = React.lazy(() =>
  import('@/components/auth/ProtectedRoute').then((m) => ({ default: m.ProtectedRoute }))
)
const AdminRoute = React.lazy(() =>
  import('@/components/auth/ProtectedRoute').then((m) => ({ default: m.AdminRoute }))
)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading…</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/submit" element={<SubmitIdeaPage />} />
                <Route path="/ideas" element={<IdeasPage />} />
                <Route path="/ideas/:id" element={<IdeaDetailPage />} />
              </Route>
            </Route>
            <Route element={<AdminRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
