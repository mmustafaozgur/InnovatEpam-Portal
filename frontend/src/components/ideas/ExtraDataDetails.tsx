import { CATEGORY_FIELD_SCHEMA, OPTION_LABELS } from './categoryFieldSchema'
import type { CategoryFieldDef } from './categoryFieldSchema'

interface ExtraDataDetailsProps {
  category: string
  extra_data: Record<string, unknown> | null
}

export function ExtraDataDetails({ category, extra_data }: ExtraDataDetailsProps) {
  const fields: CategoryFieldDef[] = CATEGORY_FIELD_SCHEMA[category] ?? []

  if (!extra_data || fields.length === 0) return null

  return (
    <section className="mt-5 pt-5 border-t border-border">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Details</h2>
      <dl className="flex flex-col gap-3">
        {fields.map((field) => {
          const value = extra_data[field.key]
          if (value === null || value === undefined) return null

          const displayValue =
            field.type === 'select'
              ? (OPTION_LABELS[value as string] ?? String(value))
              : String(value)

          return (
            <div key={field.key} className="flex flex-col gap-0.5">
              <dt className="text-xs text-slate-500">{field.label}</dt>
              <dd className="text-sm text-slate-700">{displayValue}</dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
