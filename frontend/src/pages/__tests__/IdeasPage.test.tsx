import { render, screen, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import IdeasPage from '../IdeasPage'

vi.mock('@/api/ideas', () => ({
  listIdeas: vi.fn(),
}))

import { listIdeas } from '@/api/ideas'

function renderWithAuth(role: 'submitter' | 'admin') {
  const user = { id: 'u1', full_name: 'Test', email: 't@epam.com', role }
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, isLoading: false, login: vi.fn(), logout: vi.fn() }}>
        <IdeasPage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

const emptyList = { ideas: [], total: 0, page: 1, limit: 20 }
const ideaList = {
  ideas: [
    { id: 'i1', title: 'Idea One', category: 'technology', submitter_name: 'Alice', submitted_at: '2026-05-13T10:00:00Z', has_attachment: false },
  ],
  total: 1, page: 1, limit: 20,
}

describe('IdeasPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows skeleton while loading', () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(() => {}))
    renderWithAuth('submitter')
    expect(screen.getByLabelText('Loading ideas')).toBeInTheDocument()
  })

  it('shows empty state with Lightbulb icon for Submitter', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(screen.getByText(/no ideas yet/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /submit an idea/i })).toBeInTheDocument()
  })

  it('shows empty state without CTA for Evaluator (admin)', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(emptyList)
    renderWithAuth('admin')
    await waitFor(() => expect(screen.getByText(/no ideas yet/i)).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /submit an idea/i })).not.toBeInTheDocument()
  })

  it('renders table rows when ideas returned', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaList)
    renderWithAuth('submitter')
    await waitFor(() => expect(screen.getByText('Idea One')).toBeInTheDocument())
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})
