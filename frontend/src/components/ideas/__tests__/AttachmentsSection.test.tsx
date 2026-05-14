import { render, screen } from '@testing-library/react'
import { AttachmentsSection } from '../AttachmentsSection'
import type { AttachmentInfo } from '@/types/ideas'

const imageAttachment: AttachmentInfo = {
  id: 'a1', name: 'photo.png', size: 1024, mime_type: 'image/png', is_image: true,
}
const pdfAttachment: AttachmentInfo = {
  id: 'a2', name: 'report.pdf', size: 2048, mime_type: 'application/pdf', is_image: false,
}

describe('AttachmentsSection', () => {
  it('renders nothing when attachments array is empty', () => {
    const { container } = render(
      <AttachmentsSection attachments={[]} ideaId="i1" canDownload={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders inline <img> for image attachment', () => {
    render(
      <AttachmentsSection attachments={[imageAttachment]} ideaId="i1" canDownload={false} />
    )
    const img = screen.getByRole('img', { name: /photo\.png/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/api/v1/ideas/i1/attachments/a1')
  })

  it('renders lucide icon and filename for non-image attachment', () => {
    render(
      <AttachmentsSection attachments={[pdfAttachment]} ideaId="i1" canDownload={false} />
    )
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows download link for non-image when canDownload=true', () => {
    render(
      <AttachmentsSection attachments={[pdfAttachment]} ideaId="i1" canDownload={true} />
    )
    const link = screen.getByRole('link', { name: /download/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/api/v1/ideas/i1/attachments/a2')
  })

  it('hides download link for non-image when canDownload=false', () => {
    render(
      <AttachmentsSection attachments={[pdfAttachment]} ideaId="i1" canDownload={false} />
    )
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument()
  })

  it('shows download link for image attachment when canDownload=true', () => {
    render(
      <AttachmentsSection attachments={[imageAttachment]} ideaId="i1" canDownload={true} />
    )
    expect(screen.getByRole('img', { name: /photo\.png/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download/i })).toBeInTheDocument()
  })

  it('renders both image tile and PDF tile with download links when canDownload=true', () => {
    render(
      <AttachmentsSection
        attachments={[imageAttachment, pdfAttachment]}
        ideaId="i1"
        canDownload={true}
      />
    )
    expect(screen.getByRole('img', { name: /photo\.png/i })).toBeInTheDocument()
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /download/i })).toHaveLength(2)
  })
})
