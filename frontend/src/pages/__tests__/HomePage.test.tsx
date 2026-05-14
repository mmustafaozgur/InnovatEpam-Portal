import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import HomePage from '../HomePage'

function renderWithAuth(role: 'submitter' | 'admin' = 'submitter') {
  const user = { id: 'u1', full_name: 'Test User', email: 'test@epam.com', role }
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, isLoading: false, login: vi.fn(), logout: vi.fn() }}>
        <HomePage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('HomePage — stage navigation cards', () => {
  it('renders exactly 5 stage navigation cards', () => {
    renderWithAuth()
    const links = screen.getAllByRole('link').filter(l =>
      (l as HTMLAnchorElement).href.includes('/ideas?stage=')
    )
    expect(links).toHaveLength(5)
  })

  it('each card links to /ideas?stage=<value>', () => {
    renderWithAuth()
    const expectedStages = [
      'new_idea',
      'initial_screening',
      'technical_review',
      'business_impact_assessment',
      'final_selection',
    ]
    for (const stage of expectedStages) {
      const link = screen.getByRole('link', { name: new RegExp(stage.replace(/_/g, '[ _]'), 'i') })
      expect(link).toHaveAttribute('href', `/ideas?stage=${stage}`)
    }
  })

  it('renders welcome greeting with user name', () => {
    renderWithAuth()
    expect(screen.getByText(/Welcome, Test User/i)).toBeInTheDocument()
  })

  it('renders role badge', () => {
    renderWithAuth()
    expect(screen.getByText(/submitter/i)).toBeInTheDocument()
  })

  it('does NOT render old "Browse Ideas" / "Submit an Idea" quick-action buttons', () => {
    renderWithAuth('submitter')
    expect(screen.queryByRole('link', { name: /browse ideas/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /submit an idea/i })).not.toBeInTheDocument()
  })
})
