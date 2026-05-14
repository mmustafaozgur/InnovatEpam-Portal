import { render, screen, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '@/context/AuthContext'
import IdeaDetailPage from '../IdeaDetailPage'
import type { IdeaDetailResponse } from '@/types/ideas'

vi.mock('@/api/ideas', () => ({
  getIdea: vi.fn(),
  advanceStage: vi.fn(),
}))

import { getIdea } from '@/api/ideas'

const baseIdea: IdeaDetailResponse = {
  id: 'i1',
  title: 'My Idea',
  description: 'A long description',
  category: 'technology',
  submitter_id: 'u1',
  submitter_name: 'Alice',
  submitted_at: '2026-05-13T10:00:00Z',
  attachments: [],
  current_stage: 'new_idea',
  assigned_admin_id: null,
  assigned_admin_name: null,
  stage_reviews: [],
  extra_data: null,
}

const ideaWithFile: IdeaDetailResponse = {
  ...baseIdea,
  attachments: [{ id: 'a1', name: 'doc.pdf', size: 2048, mime_type: 'application/pdf', is_image: false }],
}

const ideaWithImage: IdeaDetailResponse = {
  ...baseIdea,
  attachments: [{ id: 'a2', name: 'photo.png', size: 1024, mime_type: 'image/png', is_image: true }],
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
    vi.mocked(getIdea).mockResolvedValueOnce(baseIdea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.getByText('A long description')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText(/2026-05-13/)).toBeInTheDocument()
  })

  it('renders download link for non-image attachment when user is the submitter', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(ideaWithFile)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('doc.pdf')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument()
  })

  it('does NOT render download link for non-owner submitter', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(ideaWithFile)
    renderWithAuth('other-user', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
  })

  it('renders download link for admin even if not submitter', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(ideaWithFile)
    renderWithAuth('other-user', 'admin')
    await waitFor(() => expect(screen.getByText('doc.pdf')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument()
  })

  it('renders inline <img> for image attachment regardless of canDownload', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(ideaWithImage)
    renderWithAuth('other-user', 'submitter')
    await waitFor(() => expect(screen.getByRole('img', { name: /photo\.png/i })).toBeInTheDocument())
  })

  it('renders without errors when attachments array is empty', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(baseIdea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// StageBadge visibility
// ---------------------------------------------------------------------------

describe('IdeaDetailPage — stage badge', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders StageBadge with "New Idea" for new_idea stage', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(baseIdea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getAllByText('New Idea').length).toBeGreaterThanOrEqual(1))
  })

  it('renders StageBadge with "Initial Screening" for initial_screening stage', async () => {
    const idea: IdeaDetailResponse = {
      ...baseIdea,
      current_stage: 'initial_screening',
      assigned_admin_id: 'admin1',
      assigned_admin_name: 'Admin One',
    }
    vi.mocked(getIdea).mockResolvedValueOnce(idea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('Initial Screening')).toBeInTheDocument())
  })

  it('renders StageBadge with "Final Selection" for final_selection stage', async () => {
    const idea: IdeaDetailResponse = {
      ...baseIdea,
      current_stage: 'final_selection',
      assigned_admin_id: 'admin1',
      assigned_admin_name: 'Admin One',
      stage_reviews: [{
        id: 'sr1', stage: 'final_selection', outcome: 'accepted',
        comment: null, reviewer_name: 'Admin One', reviewed_at: '2026-05-13T11:00:00Z',
      }],
    }
    vi.mocked(getIdea).mockResolvedValueOnce(idea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getAllByText('Final Selection').length).toBeGreaterThanOrEqual(1))
  })
})

// ---------------------------------------------------------------------------
// StageAdvanceForm visibility
// ---------------------------------------------------------------------------

describe('IdeaDetailPage — StageAdvanceForm visibility', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('admin sees StageAdvanceForm on unassigned new_idea', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(baseIdea)
    renderWithAuth('admin1', 'admin')
    await waitFor(() => expect(screen.getByRole('button', { name: /advance stage/i })).toBeInTheDocument())
  })

  it('submitter does NOT see StageAdvanceForm', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(baseIdea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /advance stage/i })).not.toBeInTheDocument()
  })

  it('admin does NOT see StageAdvanceForm on locked (final_selection) idea', async () => {
    const idea: IdeaDetailResponse = {
      ...baseIdea,
      current_stage: 'final_selection',
      assigned_admin_id: 'admin1',
      assigned_admin_name: 'Admin One',
    }
    vi.mocked(getIdea).mockResolvedValueOnce(idea)
    renderWithAuth('admin1', 'admin')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /advance stage/i })).not.toBeInTheDocument()
  })

  it('non-assigned admin does NOT see StageAdvanceForm when another admin is assigned', async () => {
    const idea: IdeaDetailResponse = {
      ...baseIdea,
      current_stage: 'initial_screening',
      assigned_admin_id: 'admin1',
      assigned_admin_name: 'Admin One',
    }
    vi.mocked(getIdea).mockResolvedValueOnce(idea)
    renderWithAuth('admin2', 'admin')  // different admin
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /advance stage/i })).not.toBeInTheDocument()
  })

  it('assigned admin DOES see StageAdvanceForm', async () => {
    const idea: IdeaDetailResponse = {
      ...baseIdea,
      current_stage: 'initial_screening',
      assigned_admin_id: 'admin1',
      assigned_admin_name: 'Admin One',
    }
    vi.mocked(getIdea).mockResolvedValueOnce(idea)
    renderWithAuth('admin1', 'admin')
    await waitFor(() => expect(screen.getByRole('button', { name: /advance stage/i })).toBeInTheDocument())
  })
})

// ---------------------------------------------------------------------------
// Reviewer name
// ---------------------------------------------------------------------------

describe('IdeaDetailPage — reviewer name', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders "—" when assigned_admin_name is null', async () => {
    vi.mocked(getIdea).mockResolvedValueOnce(baseIdea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.getByText(/Reviewer: —/)).toBeInTheDocument()
  })

  it('renders reviewer name when assigned_admin_name is present', async () => {
    const idea: IdeaDetailResponse = {
      ...baseIdea,
      current_stage: 'initial_screening',
      assigned_admin_id: 'admin1',
      assigned_admin_name: 'Bob Admin',
    }
    vi.mocked(getIdea).mockResolvedValueOnce(idea)
    renderWithAuth('u1', 'submitter')
    await waitFor(() => expect(screen.getByText('My Idea')).toBeInTheDocument())
    expect(screen.getByText(/Bob Admin/)).toBeInTheDocument()
  })
})
