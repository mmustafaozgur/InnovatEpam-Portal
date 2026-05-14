const CATEGORY_LABELS: Record<string, string> = {
  process_improvement: 'Process Improvement',
  technology: 'Technology',
  cost_saving: 'Cost Saving',
  talent_development: 'Talent Development',
  client_delivery: 'Client Delivery',
  workplace_culture: 'Workplace Culture',
  other: 'Other',
}

const CATEGORY_COLORS: Record<string, string> = {
  process_improvement: 'bg-blue-100 text-blue-700',
  technology: 'bg-violet-100 text-violet-700',
  cost_saving: 'bg-emerald-100 text-emerald-700',
  talent_development: 'bg-amber-100 text-amber-700',
  client_delivery: 'bg-cyan-100 text-cyan-700',
  workplace_culture: 'bg-pink-100 text-pink-700',
  other: 'bg-slate-100 text-slate-700',
}

export function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? 'bg-slate-100 text-slate-700'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}
