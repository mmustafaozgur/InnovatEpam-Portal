import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import IdeasPage from '../IdeasPage'

vi.mock('@/api/ideas', () => ({
  listIdeas: vi.fn(),
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
    {
      id: 'i1', title: 'Idea One', category: 'technology', submitter_name: 'Alice',
      submitted_at: '2026-05-13T10:00:00Z', attachment_count: 0,
      current_stage: 'new_idea' as const, reviewer_name: null, extra_data: null,
    },
  ],
  total: 1, page: 1, limit: 20,
}

describe('IdeasPage — original tests', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows skeleton while loading', () => {
    vi.mocked(listIdeas).mockReturnValueOnce(new Promise(() => {}))
    renderWithAuth('submitter')
    expect(screen.getByLabelText('Loading ideas')).toBeInTheDocument()
  })

  it('shows empty state with Lightbulb icon for Submitter', async () => {
    vi.mocked(listIdeas).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(screen.getByText(/no ideas yet/i)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /submit an idea/i })).toBeInTheDocument()
  })

  it('shows empty state without CTA for Evaluator (admin)', async () => {
    vi.mocked(listIdeas).mockResolvedValueOnce(emptyList)
    renderWithAuth('admin')
    await waitFor(() => expect(screen.getByText(/no ideas yet/i)).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /submit an idea/i })).not.toBeInTheDocument()
  })

  it('renders table rows when ideas returned', async () => {
    vi.mocked(listIdeas).mockResolvedValueOnce(ideaList)
    renderWithAuth('submitter')
    await waitFor(() => expect(screen.getByText('Idea One')).toBeInTheDocument())
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// mine filter + URL-state tests
// ---------------------------------------------------------------------------

describe('IdeasPage — mine filter', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('Submitter sees "My Ideas" toggle', async () => {
    vi.mocked(listIdeas).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    expect(screen.getByRole('combobox', { name: /scope/i })).toBeInTheDocument()
  })

  it('Admin does NOT see "My Ideas" toggle', async () => {
    vi.mocked(listIdeas).mockResolvedValueOnce(emptyList)
    renderWithAuth('admin')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    expect(screen.queryByRole('combobox', { name: /scope/i })).not.toBeInTheDocument()
  })

  it('activating toggle sets mine=1 in URL and resets page to 1', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
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
    vi.mocked(listIdeas).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter', '/ideas?mine=1')
    await waitFor(() => {
      const calls = vi.mocked(listIdeas).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][2]).toBe(true)  // mine is the 3rd arg
    })
  })

  it('deactivating toggle removes mine from URL and resets page to 1', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
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
    const page1 = {
      ideas: Array.from({ length: 20 }, (_, i) => ({
        id: `i${i}`, title: `Idea ${i}`, category: 'technology',
        submitter_name: 'Test', submitted_at: '2026-05-13T10:00:00Z', attachment_count: 0,
        current_stage: 'new_idea' as const, reviewer_name: null, extra_data: null,
      })),
      total: 25, page: 1, limit: 20,
    }
    vi.mocked(listIdeas).mockResolvedValue(page1)
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
    vi.mocked(listIdeas).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter', '/ideas?mine=1')
    await waitFor(() => expect(screen.getByText(/haven't submitted any ideas/i)).toBeInTheDocument())
  })
})

// ---------------------------------------------------------------------------
// StageFilterCards integration tests (replaces old StageFilter dropdown tests)
// ---------------------------------------------------------------------------

describe('IdeasPage — StageFilterCards integration', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders 5 stage filter card buttons', async () => {
    vi.mocked(listIdeas).mockResolvedValueOnce(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    const buttons = screen.getAllByRole('button').filter(b => b.hasAttribute('aria-pressed'))
    expect(buttons).toHaveLength(5)
  })

  it('clicking a stage card passes stages array to listIdeas', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /final selection/i }))

    await waitFor(() => {
      const calls = vi.mocked(listIdeas).mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[3]).toEqual(['final_selection'])
    })
  })

  it('mine toggle + stage card simultaneously sends both params to listIdeas', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())

    // Activate mine filter
    const mineSelect = screen.getByRole('combobox', { name: /scope/i })
    fireEvent.change(mineSelect, { target: { value: 'mine' } })

    // Then click a stage filter card
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /new idea/i }))

    await waitFor(() => {
      const calls = vi.mocked(listIdeas).mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[2]).toBe(true)
      expect(lastCall[3]).toEqual(['new_idea'])
    })
  })
})

// ---------------------------------------------------------------------------
// T012 — IdeasPage with StageFilterCards (URL persistence)
// ---------------------------------------------------------------------------

describe('IdeasPage — StageFilterCards URL persistence', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('single card selected → URL has ?stage=<value>', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())

    const newIdeaBtn = screen.getByRole('button', { name: /new idea/i })
    fireEvent.click(newIdeaBtn)

    await waitFor(() => {
      const params = screen.getByTestId('search-params').textContent ?? ''
      expect(params).toContain('stage=new_idea')
    })
  })

  it('two cards selected → URL has two stage= params', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /new idea/i }))
    await waitFor(() => expect(screen.getByTestId('search-params').textContent).toContain('stage=new_idea'))

    fireEvent.click(screen.getByRole('button', { name: /technical review/i }))
    await waitFor(() => {
      const params = screen.getByTestId('search-params').textContent ?? ''
      expect(params).toContain('stage=new_idea')
      expect(params).toContain('stage=technical_review')
    })
  })

  it('deselect all → no stage= in URL', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter', '/ideas?stage=new_idea')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /new idea/i }))
    await waitFor(() => {
      const params = screen.getByTestId('search-params').textContent ?? ''
      expect(params).not.toContain('stage=')
    })
  })

  it('on mount with ?stage=new_idea, that card shows selected state (aria-pressed=true)', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter', '/ideas?stage=new_idea')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())

    const newIdeaBtn = screen.getByRole('button', { name: /new idea/i })
    expect(newIdeaBtn).toHaveAttribute('aria-pressed', 'true')
  })
})

// ---------------------------------------------------------------------------
// T015 — IdeasPage combined mine=1 + stage filter
// ---------------------------------------------------------------------------

describe('IdeasPage — mine=1 + StageFilterCards combined', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('mine=1 + stage=new_idea calls listIdeas with mine:true and stages:[new_idea]', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter', '/ideas?mine=1&stage=new_idea')
    await waitFor(() => {
      const calls = vi.mocked(listIdeas).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      const lastCall = calls[calls.length - 1]
      expect(lastCall[2]).toBe(true)
      expect(lastCall[3]).toEqual(['new_idea'])
    })
  })

  it('mine=1 + stage=new_idea: new_idea filter card shows selected state', async () => {
    vi.mocked(listIdeas).mockResolvedValue(emptyList)
    renderWithAuth('submitter', '/ideas?mine=1&stage=new_idea')
    await waitFor(() => expect(listIdeas).toHaveBeenCalled())
    const newIdeaBtn = screen.getByRole('button', { name: /new idea/i })
    expect(newIdeaBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
