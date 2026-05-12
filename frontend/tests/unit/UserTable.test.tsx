import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserTable from '@/components/users/UserTable'
import type { User } from '@/types/auth'

vi.mock('@/api/auth', () => ({
  promoteUser: vi.fn(),
}))

const currentAdmin: User = { id: 'admin-1', full_name: 'Admin', email: 'admin@epam.com', role: 'admin' }
const submitter: User = { id: 'sub-1', full_name: 'Sub User', email: 'sub@epam.com', role: 'submitter' }
const otherAdmin: User = { id: 'admin-2', full_name: 'Other Admin', email: 'other@epam.com', role: 'admin' }

describe('UserTable', () => {
  it('renders a row per user with full_name, email, role, created_at columns', () => {
    render(<UserTable users={[submitter]} currentUser={currentAdmin} onRefresh={vi.fn()} />)
    expect(screen.getByText('Sub User')).toBeInTheDocument()
    expect(screen.getByText('sub@epam.com')).toBeInTheDocument()
    expect(screen.getByText('submitter')).toBeInTheDocument()
  })

  it('shows Promote button for submitter rows that are not the current user', () => {
    render(<UserTable users={[submitter]} currentUser={currentAdmin} onRefresh={vi.fn()} />)
    expect(screen.getByRole('button', { name: /promote/i })).toBeInTheDocument()
  })

  it('does not show Promote button on admin rows', () => {
    render(<UserTable users={[otherAdmin]} currentUser={currentAdmin} onRefresh={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /promote/i })).not.toBeInTheDocument()
  })

  it("does not show Promote button on the current user's own row", () => {
    const selfSubmitter: User = { ...currentAdmin, role: 'submitter' }
    render(<UserTable users={[selfSubmitter]} currentUser={selfSubmitter} onRefresh={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /promote/i })).not.toBeInTheDocument()
  })

  it('calls promoteUser and invokes onRefresh on Promote click', async () => {
    const { promoteUser } = await import('@/api/auth')
    vi.mocked(promoteUser).mockResolvedValue({ ...submitter, role: 'admin' })
    const onRefresh = vi.fn()
    render(<UserTable users={[submitter]} currentUser={currentAdmin} onRefresh={onRefresh} />)
    await userEvent.click(screen.getByRole('button', { name: /promote/i }))
    expect(promoteUser).toHaveBeenCalledWith(submitter.id)
    expect(onRefresh).toHaveBeenCalled()
  })
})
