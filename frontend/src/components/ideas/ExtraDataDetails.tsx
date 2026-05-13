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
    <section className="mt-8 pt-6 border-t border-border">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Details</h2>
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
