import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import SubmitIdeaPage from '../SubmitIdeaPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})

vi.mock('@/api/ideas', () => ({
  submitIdea: vi.fn(),
}))

// Mock Radix UI Select with a native <select> so jsdom can interact with it
vi.mock('@/components/ui/select', () => ({
  Select: ({ onValueChange, children }: any) => (
    <select
      aria-label="Category"
      onChange={(e) => onValueChange(e.target.value)}
      defaultValue=""
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <option value="" disabled>{placeholder}</option>,
}))

import { submitIdea } from '@/api/ideas'

function renderWithAuth(role: 'submitter' | 'admin') {
  const user = { id: 'u1', full_name: 'Test User', email: 'test@epam.com', role }
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, isLoading: false, login: vi.fn(), logout: vi.fn() }}>
        <SubmitIdeaPage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('SubmitIdeaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows form for Submitter role', () => {
    renderWithAuth('submitter')
    expect(screen.getByRole('heading', { name: /submit an idea/i })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows RoleRestrictionNotice for Evaluator (admin) role', () => {
    renderWithAuth('admin')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument()
  })

  it('shows validation errors when form is submitted empty', async () => {
    renderWithAuth('submitter')
    const submitBtn = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitBtn)
    await waitFor(() => {
      expect(screen.getAllByRole('paragraph').length).toBeGreaterThan(0)
    })
  })

  it('calls submitIdea and navigates on successful submit', async () => {
    const mockIdea = {
      id: 'idea-123',
      title: 'Great Idea',
      description: 'A desc',
      category: 'technology',
      submitter_id: 'u1',
      submitter_name: 'Test User',
      submitted_at: '2026-05-13T10:00:00Z',
      file: null,
    }
    ;(submitIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockIdea)

    renderWithAuth('submitter')

    await userEvent.type(screen.getByLabelText(/title/i), 'Great Idea')
    await userEvent.type(screen.getByLabelText(/description/i), 'A desc')

    // Select category via the mocked native select
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'technology')

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(submitIdea).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/ideas/idea-123')
    })
  })
})
