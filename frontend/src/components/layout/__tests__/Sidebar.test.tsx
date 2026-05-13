import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import Sidebar from '../Sidebar'

type Role = 'submitter' | 'admin'

function renderSidebar({
  role = 'submitter' as Role,
  initialPath = '/',
  logout = vi.fn(),
} = {}) {
  const user = { id: 'u1', full_name: 'Alice Smith', email: 'alice@epam.com', role }
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={{ user, isLoading: false, login: vi.fn(), logout }}>
        <Sidebar />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// T002 — Desktop sidebar tests
// ---------------------------------------------------------------------------

describe('Sidebar — desktop nav', () => {
  it('submitter sees Home, Ideas, Submit an Idea', () => {
    renderSidebar({ role: 'submitter' })
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ideas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Submit an Idea' })).toBeInTheDocument()
  })

  it('submitter does NOT see Manage Users', () => {
    renderSidebar({ role: 'submitter' })
    expect(screen.queryByRole('link', { name: 'Manage Users' })).not.toBeInTheDocument()
  })

  it('admin sees Home, Ideas, Manage Users', () => {
    renderSidebar({ role: 'admin' })
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ideas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage Users' })).toBeInTheDocument()
  })

  it('admin does NOT see Submit an Idea', () => {
    renderSidebar({ role: 'admin' })
    expect(screen.queryByRole('link', { name: 'Submit an Idea' })).not.toBeInTheDocument()
  })

  it('active nav item has active pill class on current route', () => {
    renderSidebar({ role: 'submitter', initialPath: '/ideas' })
    const ideasLink = screen.getByRole('link', { name: 'Ideas' })
    expect(ideasLink.className).toContain('bg-primary/10')
    expect(ideasLink.className).toContain('text-primary')
  })

  it('sub-route /ideas/42 highlights the Ideas nav item (prefix match)', () => {
    renderSidebar({ role: 'submitter', initialPath: '/ideas/42' })
    const ideasLink = screen.getByRole('link', { name: 'Ideas' })
    expect(ideasLink.className).toContain('bg-primary/10')
  })

  it('/ does NOT activate Ideas nav item', () => {
    renderSidebar({ role: 'submitter', initialPath: '/' })
    const ideasLink = screen.getByRole('link', { name: 'Ideas' })
    expect(ideasLink.className).not.toContain('bg-primary/10')
  })

  it('brand link renders as an anchor pointing to /', () => {
    renderSidebar()
    const brandLink = screen.getByRole('link', { name: /innovatepam/i })
    expect(brandLink).toHaveAttribute('href', '/')
  })

  it('footer shows user full_name', () => {
    renderSidebar()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('footer shows role badge', () => {
    renderSidebar({ role: 'submitter' })
    expect(screen.getByText('submitter')).toBeInTheDocument()
  })

  it('footer has Sign Out button', () => {
    renderSidebar()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('Sign Out button calls logout()', () => {
    const logout = vi.fn()
    renderSidebar({ logout })
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// T005 — Mobile sidebar tests
// ---------------------------------------------------------------------------

describe('Sidebar — mobile', () => {
  it('hamburger button is present in DOM', () => {
    renderSidebar()
    expect(screen.getByRole('button', { name: /open navigation/i })).toBeInTheDocument()
  })

  it('sidebar panel has -translate-x-full class when mobileOpen is false', () => {
    renderSidebar()
    const panel = screen.getByRole('complementary')
    expect(panel.className).toContain('-translate-x-full')
  })

  it('after hamburger click, sidebar panel has translate-x-0', () => {
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    const panel = screen.getByRole('complementary')
    expect(panel.className).toContain('translate-x-0')
    expect(panel.className).not.toContain('-translate-x-full')
  })

  it('after hamburger click then nav-item click, sidebar closes', () => {
    renderSidebar({ role: 'submitter' })
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    fireEvent.click(screen.getByRole('link', { name: 'Home' }))
    const panel = screen.getByRole('complementary')
    expect(panel.className).toContain('-translate-x-full')
  })

  it('clicking the backdrop closes the sidebar', () => {
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    const backdrop = screen.getByTestId('mobile-backdrop')
    fireEvent.click(backdrop)
    const panel = screen.getByRole('complementary')
    expect(panel.className).toContain('-translate-x-full')
  })
})
