import { Link } from 'react-router-dom'
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
import { EvaluationStatusBadge } from './EvaluationStatusBadge'

export function IdeasTable({ ideas }: { ideas: IdeaSummaryResponse[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-2/5">
              Title
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/5">
              Category
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/5">
              Submitter
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/5">
              Date
            </TableHead>
            <TableHead className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/5">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea) => (
            <TableRow
              key={idea.id}
              className="hover:bg-slate-50 transition-colors duration-150"
            >
              <TableCell className="px-4 py-3">
                <Link
                  to={`/ideas/${idea.id}`}
                  className="text-primary font-medium hover:underline underline-offset-2 cursor-pointer transition-colors duration-200"
                >
                  {idea.title}
                </Link>
              </TableCell>
              <TableCell className="px-4 py-3">
                <CategoryBadge category={idea.category} />
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700">
                {idea.submitter_name}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-700">
                {idea.submitted_at.slice(0, 10)}
              </TableCell>
              <TableCell className="px-4 py-3">
                {idea.evaluation_status && (
                  <EvaluationStatusBadge status={idea.evaluation_status} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
