import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuth } from '@/context/AuthContext'
import { updateProfile } from '@/api/auth'

const accountInfoSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').trim(),
})

type FormValues = z.infer<typeof accountInfoSchema>

export default function AccountInfoSection() {
  const { user, updateUser } = useAuth()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(accountInfoSchema),
    defaultValues: { full_name: user?.full_name ?? '' },
  })

  const onSubmit = async (values: FormValues) => {
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const updated = await updateProfile({ full_name: values.full_name })
      updateUser(updated)
      setSuccessMsg('Profile updated successfully.')
    } catch {
      setErrorMsg('Failed to update profile. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-border">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Account Information</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="profile-full-name">Full Name</FormLabel>
                <FormControl>
                  <Input id="profile-full-name" type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="profile-email">
              Email
            </label>
            <Input
              id="profile-email"
              type="email"
              value={user?.email ?? ''}
              disabled
              className="opacity-60 cursor-not-allowed bg-slate-50"
            />
          </div>

          {successMsg && (
            <div
              role="status"
              className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
            >
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting} className="mt-2">
            {form.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
