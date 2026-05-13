import { useState } from 'react'
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

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(150, 'Title must be 150 characters or less'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(3000, 'Description must be 3,000 characters or less'),
  category: z.enum(['process_improvement', 'technology', 'cost_saving', 'other'], {
    required_error: 'Please select a category',
  }),
})

type FormValues = z.infer<typeof schema>

export default function SubmitIdeaPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [attachedFile, setAttachedFile] = useState<File | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', category: undefined },
  })

  const onSubmit = async (values: FormValues) => {
    const fd = new FormData()
    fd.append('title', values.title)
    fd.append('description', values.description)
    fd.append('category', values.category)
    if (attachedFile) fd.append('file', attachedFile)

    const idea = await submitIdea(fd)
    navigate(`/ideas/${idea.id}`)
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-600 text-xs mt-1" />
                  </FormItem>
                )}
              />

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
