import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
      category: 'other',
      submitter_id: 'u1',
      submitter_name: 'Test User',
      submitted_at: '2026-05-13T10:00:00Z',
      attachments: [],
      evaluation: { status: 'submitted', comment: null, evaluated_at: null, assigned_admin_id: null, assigned_admin_name: null },
      extra_data: null,
    }
    ;(submitIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockIdea)

    renderWithAuth('submitter')

    await userEvent.type(screen.getByLabelText(/title/i), 'Great Idea')
    await userEvent.type(screen.getByLabelText(/description/i), 'A desc')

    // Use "other" category — no extra fields required
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'other')

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(submitIdea).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/ideas/idea-123')
    })
  })
})

// ---------------------------------------------------------------------------
// T021 — multi-file FormData tests
// ---------------------------------------------------------------------------

describe('SubmitIdeaPage — multi-file attachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('appends attached files under the "files" key in FormData', async () => {
    let capturedFd: FormData | null = null
    const mockIdea = {
      id: 'idea-123', title: 'T', description: 'D', category: 'other',
      submitter_id: 'u1', submitter_name: 'Test User',
      submitted_at: '2026-05-13T10:00:00Z', attachments: [],
      evaluation: { status: 'submitted', comment: null, evaluated_at: null, assigned_admin_id: null, assigned_admin_name: null },
      extra_data: null,
    }
    ;(submitIdea as ReturnType<typeof vi.fn>).mockImplementation((fd: FormData) => {
      capturedFd = fd
      return Promise.resolve(mockIdea)
    })

    renderWithAuth('submitter')

    await userEvent.type(screen.getByLabelText(/title/i), 'T')
    await userEvent.type(screen.getByLabelText(/description/i), 'D')
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'other')

    // Simulate file attach via the hidden file input
    const fileInput = screen.getByLabelText(/attach files/i)
    const pdf = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [pdf] } })

    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(capturedFd).not.toBeNull()
      const filesInFd = (capturedFd as unknown as FormData).getAll('files')
      expect(filesInFd).toHaveLength(1)
      expect((filesInFd[0] as File).name).toBe('report.pdf')
    })
  })

  it('submit button is disabled while submission is in progress', async () => {
    let resolve!: (v: unknown) => void
    ;(submitIdea as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(r => { resolve = r }))

    renderWithAuth('submitter')

    await userEvent.type(screen.getByLabelText(/title/i), 'T')
    await userEvent.type(screen.getByLabelText(/description/i), 'D')
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'other')

    const submitBtn = screen.getByRole('button', { name: /submit/i })
    await userEvent.click(submitBtn)

    await waitFor(() => expect(submitBtn).toBeDisabled())

    resolve({ id: 'x', title: 'T', description: 'D', category: 'other', submitter_id: 'u1',
      submitter_name: 'Test', submitted_at: '', attachments: [],
      evaluation: { status: 'submitted', comment: null, evaluated_at: null, assigned_admin_id: null, assigned_admin_name: null },
      extra_data: null })
  })
})
