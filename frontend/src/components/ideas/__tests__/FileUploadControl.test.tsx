import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { FileUploadControl } from '../FileUploadControl'

function makePdf(size = 1024) {
  return new File([new Uint8Array(size)], 'test.pdf', { type: 'application/pdf' })
}

function makeFile(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('FileUploadControl', () => {
  it('shows Attach a file button in idle state', () => {
    render(<FileUploadControl onChange={vi.fn()} />)
    expect(screen.getByText(/attach a file/i)).toBeInTheDocument()
  })

  it('shows filename and clear button after selecting valid file', async () => {
    const onChange = vi.fn()
    render(<FileUploadControl onChange={onChange} />)

    const input = screen.getByLabelText(/attach a file/i)
    const file = makePdf()
    await userEvent.upload(input, file)

    expect(screen.getByText(/test\.pdf/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove file/i })).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith(file)
  })

  it('shows type error for wrong MIME type', () => {
    render(<FileUploadControl onChange={vi.fn()} />)
    const input = screen.getByLabelText(/attach a file/i)
    const file = makeFile('bad.txt', 'text/plain')
    // Use fireEvent to bypass userEvent's accept-attribute filtering
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText(/only pdf, docx, png, and jpg/i)).toBeInTheDocument()
  })

  it('shows size error for oversized file', () => {
    render(<FileUploadControl onChange={vi.fn()} />)
    const input = screen.getByLabelText(/attach a file/i)
    const file = makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024)
    // Use fireEvent to bypass userEvent size limits
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText(/10 mb or smaller/i)).toBeInTheDocument()
  })

  it('resets to idle state when clear button is clicked', async () => {
    const onChange = vi.fn()
    render(<FileUploadControl onChange={onChange} />)
    const input = screen.getByLabelText(/attach a file/i)
    await userEvent.upload(input, makePdf())
    const clearBtn = screen.getByRole('button', { name: /remove file/i })
    await userEvent.click(clearBtn)
    expect(screen.getByText(/attach a file/i)).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
