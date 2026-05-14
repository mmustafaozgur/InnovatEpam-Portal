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
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
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
    category: z
      .enum([
        'process_improvement',
        'technology',
        'cost_saving',
        'talent_development',
        'client_delivery',
        'workplace_culture',
        'other',
      ])
      .optional(),
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
    if (!data.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'Please select a category before submitting.',
      })
      return
    }
    const category = data.category
    if (category === 'other') return
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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  useEffect(() => {
    for (const key of ALL_EXTRA_FIELD_KEYS) {
      form.resetField(key as keyof FormValues)
    }
  }, [watchedCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (values: FormValues) => {
    const fd = new FormData()
    fd.append('title', values.title)
    fd.append('description', values.description)
    fd.append('category', values.category!)
    attachedFiles.forEach(f => fd.append('files', f))

    for (const key of ALL_EXTRA_FIELD_KEYS) {
      const val = (values as Record<string, unknown>)[key]
      if (val !== undefined && val !== null && val !== '') {
        fd.append(key, String(val))
      }
    }

    setPendingFormData(fd)
    setDialogOpen(true)
  }

  const handleConfirm = async () => {
    if (!pendingFormData) return
    setIsSubmitting(true)
    try {
      const idea = await submitIdea(pendingFormData)
      setDialogOpen(false)
      navigate(`/ideas/${idea.id}`)
    } catch (err: unknown) {
      setDialogOpen(false)
      const detail = (err as Record<string, unknown>)?.detail
      if (detail && typeof detail === 'object' && 'extra_data' in detail) {
        const extraErrors = (detail as Record<string, Record<string, string>>).extra_data
        for (const [fieldKey, message] of Object.entries(extraErrors)) {
          if (fieldKey !== '__root__') {
            form.setError(fieldKey as keyof FormValues, { message })
          }
        }
      } else {
        const message = err instanceof Error ? err.message : String(err)
        if (message.toLowerCase().includes('category') || message.toLowerCase().includes('enum')) {
          setFormError('Please select a category before submitting.')
        } else {
          setFormError(message)
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setDialogOpen(false)
    setPendingFormData(null)
  }

  return (
    <div className="px-6 py-8">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="font-heading font-semibold text-xl text-primary mb-6">Submit an Idea</h1>

        {user?.role === 'admin' ? (
          <RoleRestrictionNotice />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Card 1: Idea Details */}
              <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-5">
                  Idea Details
                </h2>
                <div className="flex flex-col gap-5">
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
                </div>
              </div>

              {/* Card 2: Category Details (conditional) */}
              {watchedCategory && watchedCategory !== 'other' && (
                <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-5">
                    Category Details
                  </h2>
                  <ExtraFieldsSection category={watchedCategory} control={form.control} />
                </div>
              )}

              {/* Card 3: Attachments */}
              <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  Attachments
                </h2>
                <FileUploadControl onFilesChange={setAttachedFiles} />
              </div>

              {formError && (
                <p className="text-sm text-red-600" role="alert">{formError}</p>
              )}

              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Idea'}
              </Button>
            </form>
          </Form>
        )}
      </div>

      <ConfirmationDialog
        open={dialogOpen}
        title="Submit Idea"
        description="Are you sure you want to submit this idea? You will not be able to edit it after submission."
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
    </div>
  )
}
