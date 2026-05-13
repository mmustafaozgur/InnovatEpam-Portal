import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { submitIdea } from '@/api/ideas'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CharacterCounter } from '@/components/ideas/CharacterCounter'
import { RoleRestrictionNotice } from '@/components/ideas/RoleRestrictionNotice'
import { FileUploadControl } from '@/components/ideas/FileUploadControl'
import { ExtraFieldsSection } from '@/components/ideas/ExtraFieldsSection'
import { CATEGORY_FIELD_SCHEMA, ALL_EXTRA_FIELD_KEYS } from '@/components/ideas/categoryFieldSchema'

const schema = z
  .object({
    title: z.string().min(1, 'Title is required').max(150, 'Title must be 150 characters or less'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(3000, 'Description must be 3,000 characters or less'),
    category: z.enum(
      [
        'process_improvement',
        'technology',
        'cost_saving',
        'talent_development',
        'client_delivery',
        'workplace_culture',
        'other',
      ],
      { required_error: 'Please select a category' }
    ),
    // Number extra fields — coerce to number so non-numeric input produces a per-field error
    estimated_time_saved_per_week: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .optional()
      .nullable(),
    current_annual_cost_usd: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .optional()
      .nullable(),
    projected_annual_saving_usd: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .optional()
      .nullable(),
    estimated_duration_hours: z.coerce
      .number({ invalid_type_error: 'Must be a number.' })
      .optional()
      .nullable(),
    // Text and select extra fields
    target_process: z.string().optional(),
    technology_tool_name: z.string().optional(),
    affected_systems_or_teams: z.string().optional(),
    target_audience: z.string().optional(),
    skill_area: z.string().optional(),
    affected_delivery_phase: z.string().optional(),
    client_impact: z.string().optional(),
    target_group: z.string().optional(),
    recurring_or_one_time: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const category = data.category
    if (!category || category === 'other') return
    const fields = CATEGORY_FIELD_SCHEMA[category] ?? []
    for (const field of fields) {
      if (!field.required) continue
      const value = (data as Record<string, unknown>)[field.key]
      const empty =
        value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
      if (empty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field.key],
          message: 'This field is required.',
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

export default function SubmitIdeaPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined,
      ...Object.fromEntries(ALL_EXTRA_FIELD_KEYS.map((k) => [k, ''])),
    },
  })

  const watchedCategory = form.watch('category')

  // T017: clear all extra field values when category changes
  useEffect(() => {
    for (const key of ALL_EXTRA_FIELD_KEYS) {
      form.resetField(key as keyof FormValues)
    }
  }, [watchedCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: FormValues) => {
    const fd = new FormData()
    fd.append('title', values.title)
    fd.append('description', values.description)
    fd.append('category', values.category)
    if (attachedFile) fd.append('file', attachedFile)

    // Append each extra field key so the API function can collect them
    for (const key of ALL_EXTRA_FIELD_KEYS) {
      const val = (values as Record<string, unknown>)[key]
      if (val !== undefined && val !== null && val !== '') {
        fd.append(key, String(val))
      }
    }

    try {
      const idea = await submitIdea(fd)
      navigate(`/ideas/${idea.id}`)
    } catch (err: unknown) {
      // T024: map server-side 422 extra_data errors to per-field inline errors
      const detail = (err as Record<string, unknown>)?.detail
      if (detail && typeof detail === 'object' && 'extra_data' in detail) {
        const extraErrors = (detail as Record<string, Record<string, string>>).extra_data
        for (const [fieldKey, message] of Object.entries(extraErrors)) {
          if (fieldKey !== '__root__') {
            form.setError(fieldKey as keyof FormValues, { message })
          }
        }
      } else {
        throw err
      }
    }
  }

  return (
    <div className="px-6 py-12">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="font-heading font-semibold text-2xl text-primary mb-8">Submit an Idea</h1>

        {user?.role === 'admin' ? (
          <RoleRestrictionNotice />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input maxLength={150} {...field} />
                    </FormControl>
                    <CharacterCounter current={field.value?.length ?? 0} max={150} />
                    <FormMessage className="text-red-600 text-xs mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea maxLength={3000} rows={6} {...field} />
                    </FormControl>
                    <CharacterCounter current={field.value?.length ?? 0} max={3000} />
                    <FormMessage className="text-red-600 text-xs mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            'w-full px-4 py-3 border rounded-lg text-base transition-colors duration-200',
                            form.formState.errors.category
                              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
                              : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                          )}
                        >
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border border-border shadow-lg rounded-lg">
                        <SelectItem value="process_improvement">Process Improvement</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="cost_saving">Cost Saving</SelectItem>
                        <SelectItem value="talent_development">Talent Development</SelectItem>
                        <SelectItem value="client_delivery">Client Delivery</SelectItem>
                        <SelectItem value="workplace_culture">Workplace Culture</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600 text-xs mt-1" />
                  </FormItem>
                )}
              />

              {watchedCategory && (
                <ExtraFieldsSection category={watchedCategory} control={form.control} />
              )}

              <FileUploadControl onChange={setAttachedFile} />

              <Button
                type="submit"
                variant="default"
                className="w-full mt-2"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Submitting…' : 'Submit'}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}
