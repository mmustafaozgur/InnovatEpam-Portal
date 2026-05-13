import { render, screen, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import IdeaDetailPage from '../IdeaDetailPage'

vi.mock('@/api/ideas', () => ({
  getIdea: vi.fn(),
  evaluateIdea: vi.fn(),
}))

import { getIdea } from '@/api/ideas'

const baseEvaluation = {
  status: 'submitted' as const,
  comment: null,
  evaluated_at: null,
  assigned_admin_id: null,
}

const ideaNoFile = {
  id: 'i1', title: 'My Idea', description: 'A long description',
  category: 'technology', submitter_id: 'u1', submitter_name: 'Alice',
  submitted_at: '2026-05-13T10:00:00Z', file: null,
  evaluation: baseEvaluation,
}
const ideaWithFile = {
  ...ideaNoFile,
  file: { name: 'doc.pdf', size: 2048, mime_type: 'application/pdf' },
}

function renderWithAuth(userId: string, role: 'submitter' | 'admin') {
  const user = { id: userId, full_name: 'Test', email: 't@epam.com', role }
  return render(
    <MemoryRouter initialEntries={['/ideas/i1']}>
      <AuthContext.Provider value={{ user, isLoading: false, login: vi.fn(), logout: vi.fn() }}>
        <Routes>
          <Route path="/ideas/:id" element={<IdeaDetailPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('IdeaDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('displays title, category, description, submitter and date', async () => {
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaNoFile)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.getByText('A long description')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText(/2026-05-13/)).toBeInTheDocument()
  })

  it('renders FileDownloadBlock when canDownload is true and file exists', async () => {
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaWithFile)
    renderWithAuth('u1', 'submitter') // same user as submitter_id
    await waitFor(() => expect(screen.getByText('doc.pdf')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument()
  })

  it('does NOT render FileDownloadBlock for other Submitters', async () => {
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaWithFile)
    renderWithAuth('other-user', 'submitter') // different user, not evaluator
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
  })

  it('renders FileDownloadBlock for evaluator (admin) even if not submitter', async () => {
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaWithFile)
    renderWithAuth('other-user', 'admin')
    await waitFor(() => expect(screen.getByText('doc.pdf')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// T030 — EvaluationStatusBadge visibility and EvaluationForm rendering
// ---------------------------------------------------------------------------

describe('IdeaDetailPage — evaluation badge', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders EvaluationStatusBadge with "Submitted" for new idea', async () => {
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaNoFile)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('Submitted')).toBeInTheDocument())
  })

  it('renders EvaluationStatusBadge with "Under Review" when under_review', async () => {
    const idea = { ...ideaNoFile, evaluation: { ...baseEvaluation, status: 'under_review' as const } }
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(idea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('Under Review')).toBeInTheDocument())
  })
})

describe('IdeaDetailPage — comment visibility (T030)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('submitter + under_review → comment block absent from DOM', async () => {
    const idea = {
      ...ideaNoFile,
      evaluation: {
        status: 'under_review' as const,
        comment: null,
        evaluated_at: '2026-05-13T10:00:00Z',
        assigned_admin_id: null,
      },
    }
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(idea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByTestId('evaluation-comment')).not.toBeInTheDocument()
  })

  it('submitter + accepted → comment block present', async () => {
    const idea = {
      ...ideaNoFile,
      evaluation: {
        status: 'accepted' as const,
        comment: 'Great idea!',
        evaluated_at: '2026-05-13T10:00:00Z',
        assigned_admin_id: null,
      },
    }
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(idea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByTestId('evaluation-comment')).toBeInTheDocument())
    expect(screen.getByText('Great idea!')).toBeInTheDocument()
  })

  it('admin + under_review → comment block present', async () => {
    const idea = {
      ...ideaNoFile,
      evaluation: {
        status: 'under_review' as const,
        comment: 'Internal note',
        evaluated_at: '2026-05-13T10:00:00Z',
        assigned_admin_id: 'admin1',
      },
    }
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(idea)
    renderWithAuth('other-user', 'admin')
    await waitFor(() => expect(screen.getByTestId('evaluation-comment')).toBeInTheDocument())
    expect(screen.getByText('Internal note')).toBeInTheDocument()
  })
})

describe('IdeaDetailPage — EvaluationForm visibility', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('admin sees EvaluationForm on submitted idea', async () => {
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaNoFile)
    renderWithAuth('admin1', 'admin')
    await waitFor(() => expect(screen.getByRole('button', { name: /save evaluation/i })).toBeInTheDocument())
  })

  it('submitter does NOT see EvaluationForm', async () => {
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(ideaNoFile)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /save evaluation/i })).not.toBeInTheDocument()
  })

  it('admin does NOT see EvaluationForm on accepted (locked) idea', async () => {
    const idea = {
      ...ideaNoFile,
      evaluation: {
        status: 'accepted' as const,
        comment: 'Great!',
        evaluated_at: '2026-05-13T10:00:00Z',
        assigned_admin_id: 'admin1',
      },
    }
    ;(getIdea as ReturnType<typeof vi.fn>).mockResolvedValueOnce(idea)
    renderWithAuth('admin1', 'admin')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /save evaluation/i })).not.toBeInTheDocument()
  })
})
