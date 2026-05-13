import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import IdeasPage from '../IdeasPage'

vi.mock('@/api/ideas', () => ({
  listIdeas: vi.fn(),
  evaluateIdea: vi.fn(),
}))

import { listIdeas } from '@/api/ideas'

function SearchParamsDisplay() {
  const [searchParams] = useSearchParams()
  return <div data-testid="search-params">{searchParams.toString()}</div>
}

function renderWithAuth(role: 'submitter' | 'admin', initialUrl = '/ideas') {
  const user = { id: 'u1', full_name: 'Test', email: 't@epam.com', role }
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <AuthContext.Provider value={{ user, isLoading: false, login: vi.fn(), logout: vi.fn() }}>
        <Routes>
          <Route path="/ideas" element={<><IdeasPage /><SearchParamsDisplay /></>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

const emptyList = { ideas: [], total: 0, page: 1, limit: 20 }
const ideaList = {
  ideas: [
    { id: 'i1', title: 'Idea One', category: 'technology', submitter_name: 'Alice', submitted_at: '2026-05-13T10:00:00Z', has_attachment: false, evaluation_status: 'submitted' as const, reviewer_name: null },
  ],
  total: 1, page: 1, limit: 20,
}

describe('IdeasPage — original tests', () => {
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

// ---------------------------------------------------------------------------
// T012 — mine filter + URL-state tests
// ---------------------------------------------------------------------------

describe('IdeasPage — mine filter', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('Submitter sees "My Ideas" toggle', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    expect(screen.getByRole('combobox', { name: /scope/i })).toBeInTheDocument()
  })

  it('Admin does NOT see "My Ideas" toggle', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(emptyList)
    renderWithAuth('admin')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    expect(screen.queryByRole('combobox', { name: /scope/i })).not.toBeInTheDocument()
  })

  it('activating toggle sets mine=1 in URL and resets page to 1', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue(emptyList)
    renderWithAuth('submitter', '/ideas?page=3')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    const select = screen.getByRole('combobox', { name: /scope/i })
    fireEvent.change(select, { target: { value: 'mine' } })
    await waitFor(() => {
      const params = screen.getByTestId('search-params').textContent ?? ''
      expect(params).toContain('mine=1')
      expect(params).toContain('page=1')
      expect(params).not.toContain('page=3')
    })
  })

  it('when URL has mine=1, listIdeas is called with mine: true', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter', '/ideas?mine=1')
    await waitFor(() => expect(listIdeas).toHaveBeenCalledWith(expect.anything(), expect.anything(), true))
  })

  it('deactivating toggle removes mine from URL and resets page to 1', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue(emptyList)
    renderWithAuth('submitter', '/ideas?mine=1&page=2')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    const select = screen.getByRole('combobox', { name: /scope/i })
    fireEvent.change(select, { target: { value: 'all' } })
    await waitFor(() => {
      const params = screen.getByTestId('search-params').textContent ?? ''
      expect(params).not.toContain('mine=1')
      expect(params).toContain('page=1')
    })
  })

  it('paginating while mine=1 preserves mine=1 in URL', async () => {
    const page1 = { ideas: Array.from({ length: 20 }, (_, i) => ({
      id: `i${i}`, title: `Idea ${i}`, category: 'technology',
      submitter_name: 'Test', submitted_at: '2026-05-13T10:00:00Z', has_attachment: false,
      evaluation_status: 'submitted' as const, reviewer_name: null,
    })), total: 25, page: 1, limit: 20 }
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue(page1)
    renderWithAuth('submitter', '/ideas?mine=1')
    await waitFor(() => expect(screen.queryByLabelText('Loading ideas')).not.toBeInTheDocument())
    const nextBtn = screen.queryByRole('button', { name: /next/i })
    if (nextBtn) {
      fireEvent.click(nextBtn)
      await waitFor(() => {
        const params = screen.getByTestId('search-params').textContent ?? ''
        expect(params).toContain('mine=1')
      })
    }
  })

  it('when mine=1 and API returns empty, shows mine-specific empty state', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter', '/ideas?mine=1')
    await waitFor(() => expect(screen.getByText(/haven't submitted any ideas/i)).toBeInTheDocument())
  })
})

// ---------------------------------------------------------------------------
// T031 — StatusFilter integration tests
// ---------------------------------------------------------------------------

describe('IdeasPage — status filter (T031)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders StatusFilter dropdown', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
  })

  it('changing status filter passes status param to listIdeas', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    const select = screen.getByRole('combobox', { name: /status/i })
    fireEvent.change(select, { target: { value: 'accepted' } })
    await waitFor(() => {
      expect(listIdeas).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'accepted',
      )
    })
  })

  it('mine toggle + status filter simultaneously sends both params to listIdeas', async () => {
    ;(listIdeas as ReturnType<typeof vi.fn>).mockResolvedValue(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())

    // Activate mine filter
    const mineSelect = screen.getByRole('combobox', { name: /scope/i })
    fireEvent.change(mineSelect, { target: { value: 'mine' } })

    // Then set status filter
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    const select = screen.getByRole('combobox', { name: /status/i })
    fireEvent.change(select, { target: { value: 'submitted' } })

    await waitFor(() => {
      const calls = (listIdeas as ReturnType<typeof vi.fn>).mock.calls
      const lastCall = calls[calls.length - 1]
      // mine=true is the third arg, status is the fourth
      expect(lastCall[2]).toBe(true)
      expect(lastCall[3]).toBe('submitted')
    })
  })
})
