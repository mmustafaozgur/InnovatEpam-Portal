import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { listIdeas } from '@/api/ideas'
import type { IdeaListResponse } from '@/types/ideas'
import { IdeasTableSkeleton } from '@/components/ideas/IdeasTableSkeleton'
import { IdeasTable } from '@/components/ideas/IdeasTable'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export default function IdeasPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const mine = searchParams.get('mine') === '1'
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const [data, setData] = useState<IdeaListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    listIdeas(page, 20, mine)
      .then(setData)
      .finally(() => setIsLoading(false))
  }, [page, mine])

  const handleMineChange = (checked: boolean | 'indeterminate') => {
    const next = new URLSearchParams(searchParams)
    if (checked) {
      next.set('mine', '1')
    } else {
      next.delete('mine')
    }
    next.set('page', '1')
    setSearchParams(next)
  }

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(newPage))
    setSearchParams(next)
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  const emptyMessage = mine
    ? "You haven't submitted any ideas yet."
    : 'Be the first to submit an idea.'

  return (
    <div className="px-6 py-8">
      <h1 className="font-heading font-semibold text-xl text-primary mb-6">Ideas</h1>

      {user?.role === 'submitter' && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <label
            htmlFor="mine-filter"
            className="text-sm font-medium text-slate-600 cursor-pointer select-none"
          >
            My Ideas
          </label>
          <Checkbox
            id="mine-filter"
            checked={mine}
            onCheckedChange={handleMineChange}
          />
        </div>
      )}

      {isLoading ? (
        <IdeasTableSkeleton />
      ) : !data || data.ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <Lightbulb className="w-12 h-12 text-slate-300" />
          <p className="text-base font-semibold text-slate-500">No ideas yet</p>
          <p className="text-sm text-slate-400">{emptyMessage}</p>
          {user?.role === 'submitter' && !mine && (
            <Button variant="default" asChild>
              <Link to="/submit">Submit an Idea</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <IdeasTable ideas={data.ideas} />
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
