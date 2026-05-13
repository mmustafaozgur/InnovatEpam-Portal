const CATEGORY_LABELS: Record<string, string> = {
  process_improvement: 'Process Improvement',
  technology: 'Technology',
  cost_saving: 'Cost Saving',
  other: 'Other',
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}
