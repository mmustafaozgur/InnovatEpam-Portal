import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmationDialog } from '../ConfirmationDialog'

describe('ConfirmationDialog', () => {
  it('renders nothing when open is false', () => {
    render(
      <ConfirmationDialog
        open={false}
        title="Are you sure?"
        description="This cannot be undone."
        confirmLabel="Confirm"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument()
    expect(screen.queryByText('This cannot be undone.')).not.toBeInTheDocument()
  })

  it('renders title and description when open is true', () => {
    render(
      <ConfirmationDialog
        open
        title="Are you sure?"
        description="This cannot be undone."
        confirmLabel="Confirm"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('fires onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmationDialog
        open
        title="Confirm Action"
        description="Are you sure?"
        confirmLabel="Yes, do it"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /yes, do it/i }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('fires onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmationDialog
        open
        title="Confirm Action"
        description="Are you sure?"
        confirmLabel="Confirm"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('fires onCancel on Esc keypress', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmationDialog
        open
        title="Confirm Action"
        description="Press Esc"
        confirmLabel="Confirm"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('confirm button is disabled when isLoading is true', () => {
    render(
      <ConfirmationDialog
        open
        title="Loading"
        description="Please wait"
        confirmLabel="Submit"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isLoading
      />
    )
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('uses "Cancel" as default cancelLabel', () => {
    render(
      <ConfirmationDialog
        open
        title="Test"
        description="Test"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})
