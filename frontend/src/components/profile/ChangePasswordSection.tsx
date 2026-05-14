import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'

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
import { changePassword } from '@/api/auth'

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof changePasswordSchema>

export default function ChangePasswordSection() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  const onSubmit = async (values: FormValues) => {
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      setSuccessMsg('Password changed successfully.')
      form.reset()
    } catch (err: any) {
      if (err?.status === 400) {
        setErrorMsg('Current password is incorrect.')
      } else {
        setErrorMsg('Failed to change password. Please try again.')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-border">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Change Password</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="cp-current">Current Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="cp-current"
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Your current password"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                      onClick={() => setShowCurrent((v) => !v)}
                      aria-label={showCurrent ? 'Hide password' : 'Show password'}
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="cp-new">New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="cp-new"
                      type={showNew ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                      onClick={() => setShowNew((v) => !v)}
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="cp-confirm">Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      id="cp-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      {...field}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
            {form.formState.isSubmitting ? 'Changing…' : 'Change Password'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
