import { Info } from 'lucide-react'

export function RoleRestrictionNotice() {
  return (
    <div
      role="status"
      className="w-full rounded-lg px-4 py-4 flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm"
    >
      <Info className="w-5 h-5 shrink-0 mt-0.5" />
      <span>
        Your role is <strong>Evaluator</strong>. You can browse and evaluate ideas, but idea
        submission is reserved for Submitters.
      </span>
    </div>
  )
}
