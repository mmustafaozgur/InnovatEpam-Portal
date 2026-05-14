import { render, screen, fireEvent } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { FileUploadControl } from '../FileUploadControl'

globalThis.URL.createObjectURL = vi.fn(() => 'blob:fake-url')
globalThis.URL.revokeObjectURL = vi.fn()

const MB = 1024 * 1024

function makeFile(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('FileUploadControl (multi-file)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Attach files button in idle state', () => {
    render(<FileUploadControl onFilesChange={vi.fn()} />)
    expect(screen.getByText(/attach files/i)).toBeInTheDocument()
  })

  it('image tile renders <img> thumbnail with alt=filename', () => {
    render(<FileUploadControl onFilesChange={vi.fn()} />)
    const input = screen.getByLabelText(/attach files/i)
    fireEvent.change(input, { target: { files: [makeFile('photo.png', 'image/png')] } })
    expect(screen.getByRole('img', { name: /photo\.png/i })).toBeInTheDocument()
  })

  it('non-image tile renders icon and filename, no <img>', () => {
    render(<FileUploadControl onFilesChange={vi.fn()} />)
    const input = screen.getByLabelText(/attach files/i)
    fireEvent.change(input, { target: { files: [makeFile('report.pdf', 'application/pdf')] } })
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('remove button removes only that tile; remaining tiles stay', () => {
    const onFilesChange = vi.fn()
    render(<FileUploadControl onFilesChange={onFilesChange} />)
    const input = screen.getByLabelText(/attach files/i)
    fireEvent.change(input, {
      target: {
        files: [makeFile('doc.pdf', 'application/pdf'), makeFile('photo.png', 'image/png')],
      },
    })
    const removeBtns = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeBtns[0])
    expect(screen.queryByText('doc.pdf')).not.toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
    const lastFiles = onFilesChange.mock.calls.at(-1)![0] as File[]
    expect(lastFiles).toHaveLength(1)
    expect(lastFiles[0].name).toBe('photo.png')
  })

  it('shows count error when adding a 6th file', () => {
    render(<FileUploadControl onFilesChange={vi.fn()} />)
    const input = screen.getByLabelText(/attach files/i)
    fireEvent.change(input, {
      target: { files: Array.from({ length: 5 }, (_, i) => makeFile(`f${i}.pdf`, 'application/pdf')) },
    })
    fireEvent.change(input, { target: { files: [makeFile('extra.pdf', 'application/pdf')] } })
    expect(screen.getByText(/maximum 5 files/i)).toBeInTheDocument()
  })

  it('shows size error when total combined size exceeds 50 MB', () => {
    render(<FileUploadControl onFilesChange={vi.fn()} />)
    const input = screen.getByLabelText(/attach files/i)
    fireEvent.change(input, {
      target: { files: Array.from({ length: 3 }, (_, i) => makeFile(`big${i}.pdf`, 'application/pdf', 20 * MB)) },
    })
    expect(screen.getByText(/50 mb/i)).toBeInTheDocument()
  })

  it('onFilesChange fires with correct File[] after files added', () => {
    const onFilesChange = vi.fn()
    render(<FileUploadControl onFilesChange={onFilesChange} />)
    const input = screen.getByLabelText(/attach files/i)
    const pdf = makeFile('doc.pdf', 'application/pdf')
    fireEvent.change(input, { target: { files: [pdf] } })
    expect(onFilesChange).toHaveBeenCalledWith([pdf])
  })

  it('onFilesChange fires with empty array after removing last file', () => {
    const onFilesChange = vi.fn()
    render(<FileUploadControl onFilesChange={onFilesChange} />)
    const input = screen.getByLabelText(/attach files/i)
    fireEvent.change(input, { target: { files: [makeFile('doc.pdf', 'application/pdf')] } })
    onFilesChange.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onFilesChange).toHaveBeenCalledWith([])
  })
})
