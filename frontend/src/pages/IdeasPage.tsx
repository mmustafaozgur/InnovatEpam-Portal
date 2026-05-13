import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { listIdeas } from '@/api/ideas'
import type { IdeaListResponse } from '@/types/ideas'
import { IdeasTableSkeleton } from '@/components/ideas/IdeasTableSkeleton'
import { IdeasTable } from '@/components/ideas/IdeasTable'
import { Button } from '@/components/ui/button'

export default function IdeasPage() {
  const { user } = useAuth()
  const [data, setData] = useState<IdeaListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    listIdeas()
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="px-6 py-8">
      <h1 className="font-heading font-semibold text-xl text-primary mb-6">Ideas</h1>

      {isLoading ? (
        <IdeasTableSkeleton />
      ) : !data || data.ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <Lightbulb className="w-12 h-12 text-slate-300" />
          <p className="text-base font-semibold text-slate-500">No ideas yet</p>
          <p className="text-sm text-slate-400">Be the first to submit an idea.</p>
          {user?.role === 'submitter' && (
            <Button variant="default" asChild>
              <Link to="/submit">Submit an Idea</Link>
            </Button>
          )}
        </div>
      ) : (
        <IdeasTable ideas={data.ideas} />
      )}
    </div>
  )
}
