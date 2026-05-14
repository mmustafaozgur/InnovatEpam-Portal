import { FileText, Video, Presentation, Paperclip } from 'lucide-react'
import type { AttachmentInfo } from '@/types/ideas'

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-slate-400" />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return <Presentation className="w-5 h-5 text-slate-400" />
  if (mimeType === 'application/pdf' || mimeType.includes('word'))
    return <FileText className="w-5 h-5 text-slate-400" />
  return <Paperclip className="w-5 h-5 text-slate-400" />
}

interface AttachmentsSectionProps {
  attachments: AttachmentInfo[]
  ideaId: string
  canDownload: boolean
}

export function AttachmentsSection({ attachments, ideaId, canDownload }: AttachmentsSectionProps) {
  if (!attachments.length) return null

  return (
    <div className="flex flex-wrap gap-3">
      {attachments.map(a => {
        const url = `/api/v1/ideas/${ideaId}/attachments/${a.id}`

        return (
          <div
            key={a.id}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-slate-50"
          >
            {a.is_image ? (
              <img
                src={url}
                alt={a.name}
                className="w-10 h-10 object-cover rounded shrink-0"
              />
            ) : (
              getFileIcon(a.mime_type)
            )}
            <span className="text-sm text-slate-700 max-w-[160px] truncate">{a.name}</span>
            {canDownload && (
              <a
                href={url}
                download={a.name}
                className="text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                Download
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
