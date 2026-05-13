import type { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CharacterCounter } from './CharacterCounter'
import { CATEGORY_FIELD_SCHEMA, OPTION_LABELS } from './categoryFieldSchema'
import type { CategoryFieldDef } from './categoryFieldSchema'

interface ExtraFieldsSectionProps {
  category: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
}

export function ExtraFieldsSection({ category, control }: ExtraFieldsSectionProps) {
  const fields: CategoryFieldDef[] = CATEGORY_FIELD_SCHEMA[category] ?? []

  if (fields.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      {fields.map((field) => (
        <FormField
          key={field.key}
          control={control}
          name={field.key}
          render={({ field: formField }) => (
            <FormItem>
              <FormLabel>{field.label}</FormLabel>
              <FormControl>
                {field.type === 'select' ? (
                  <Select
                    onValueChange={formField.onChange}
                    value={formField.value ?? ''}
                  >
                    <SelectTrigger className="w-full px-4 py-3 border rounded-lg text-base transition-colors duration-200 border-border focus:border-primary focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-border shadow-lg rounded-lg">
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {OPTION_LABELS[opt] ?? opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    maxLength={field.type === 'text' ? field.max_length : undefined}
                    {...formField}
                    value={formField.value ?? ''}
                  />
                )}
              </FormControl>
              {field.type === 'text' && field.max_length && (
                <CharacterCounter
                  current={(formField.value ?? '').length}
                  max={field.max_length}
                />
              )}
              <FormMessage className="text-red-600 text-xs mt-1" />
            </FormItem>
          )}
        />
      ))}
    </div>
  )
}
