import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import { ProtectedRoute, AdminRoute } from '@/components/auth/ProtectedRoute'
import type { User } from '@/types/auth'

function makeCtx(user: User | null, isLoading = false) {
  return {
    user,
    isLoading,
    login: vi.fn(),
    logout: vi.fn(),
  }
}

const adminUser: User = { id: '1', full_name: 'Admin', email: 'a@epam.com', role: 'admin' }
const submitterUser: User = { id: '2', full_name: 'Sub', email: 's@epam.com', role: 'submitter' }

function renderWith(ctx: ReturnType<typeof makeCtx>, Route: React.ComponentType) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthContext.Provider value={ctx}>
        <Routes>
          <Route path="/protected" element={<Route />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirects to /login when user is null and not loading', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthContext.Provider value={makeCtx(null, false)}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders Outlet when user is set and not loading', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthContext.Provider value={makeCtx(adminUser, false)}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders loading spinner while isLoading is true', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthContext.Provider value={makeCtx(null, true)}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})

describe('AdminRoute', () => {
  it('renders access-denied for submitter role', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={makeCtx(submitterUser, false)}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<div>Admin Content</div>} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    )
    expect(screen.getByText(/access denied/i)).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders Outlet for admin role', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthContext.Provider value={makeCtx(adminUser, false)}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<div>Admin Content</div>} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    )
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })
})
