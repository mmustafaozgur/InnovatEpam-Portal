import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getIdea } from '@/api/ideas'
import type { IdeaDetailResponse } from '@/types/ideas'
import { CategoryBadge } from '@/components/ideas/CategoryBadge'
import { FileDownloadBlock } from '@/components/ideas/FileDownloadBlock'

export default function IdeaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [idea, setIdea] = useState<IdeaDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getIdea(id)
      .then(setIdea)
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return <div className="px-6 py-8 text-slate-400 text-sm">Loading…</div>
  }

  if (!idea) {
    return <div className="px-6 py-8 text-slate-500">Idea not found.</div>
  }

  const canDownload =
    user?.id === idea.submitter_id || user?.role === 'admin'

  return (
    <div className="px-6 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="font-heading font-semibold text-2xl text-primary mb-3">{idea.title}</h1>
          <CategoryBadge category={idea.category} />
          <p className="flex items-center gap-2 text-sm text-slate-400 mt-2">
            <span>{idea.submitter_name}</span>
            <span>·</span>
            <span>{idea.submitted_at.slice(0, 10)}</span>
          </p>
        </div>

        <p className="font-body text-base text-slate-700 leading-relaxed max-w-prose mt-6">
          {idea.description}
        </p>

        {canDownload && idea.file && (
          <div className="mt-10 pt-6 border-t border-border">
            <FileDownloadBlock
              file={{
                name: idea.file.name,
                url: `/api/v1/ideas/${idea.id}/attachment`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
