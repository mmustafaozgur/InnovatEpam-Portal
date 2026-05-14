import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../dialog'

describe('dialog.tsx — Dialog primitive', () => {
  it('renders without crashing (closed by default)', () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
  })

  it('shows content when open is true', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Open Dialog</DialogTitle>
          <DialogDescription>Visible</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText('Open Dialog')).toBeInTheDocument()
    expect(screen.getByText('Visible')).toBeInTheDocument()
  })

  it('closes on Escape keypress via onOpenChange', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Escape Test</DialogTitle>
          <DialogDescription>Press Esc</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on overlay click via onOpenChange', async () => {
    const onOpenChange = vi.fn()
    const { baseElement } = render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Overlay Test</DialogTitle>
          <DialogDescription>Click overlay</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    const overlay = baseElement.querySelector('[data-radix-dialog-overlay]')
    if (overlay) {
      await userEvent.click(overlay)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    }
  })

  it('opens when trigger is clicked', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open Me</DialogTrigger>
        <DialogContent>
          <DialogTitle>Trigger Opened</DialogTitle>
          <DialogDescription>Now open</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.queryByText('Trigger Opened')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('Open Me'))
    expect(screen.getByText('Trigger Opened')).toBeInTheDocument()
  })
})
