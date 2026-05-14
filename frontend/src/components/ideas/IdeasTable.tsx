import { useNavigate, Link } from 'react-router-dom'
import { Paperclip } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { IdeaSummaryResponse } from '@/types/ideas'
import { CategoryBadge } from './CategoryBadge'
import { StageBadge } from './StageBadge'

export function IdeasTable({ ideas }: { ideas: IdeaSummaryResponse[] }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[150px]">
              Stage
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[280px]">
              Title
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[180px]">
              Category
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[140px]">
              Submitted By
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[140px]">
              Reviewer
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[100px]">
              Date
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[80px]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea) => (
            <TableRow
              key={idea.id}
              className="hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
              onClick={() => navigate(`/ideas/${idea.id}`)}
            >
              <TableCell className="px-4 py-3">
                <StageBadge stage={idea.current_stage} outcome={idea.outcome} />
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-medium truncate">{idea.title}</span>
                  {idea.attachment_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 shrink-0">
                      <Paperclip className="w-3 h-3" />
                      {idea.attachment_count}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <CategoryBadge category={idea.category} />
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700 truncate">
                {idea.submitter_name}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700 truncate">
                {idea.reviewer_name ?? <span className="text-slate-400">—</span>}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                {idea.submitted_at.slice(0, 10)}
              </TableCell>
              <TableCell className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <Link
                  to={`/ideas/${idea.id}`}
                  className="text-primary text-sm font-medium hover:underline underline-offset-2 cursor-pointer transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                >
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
