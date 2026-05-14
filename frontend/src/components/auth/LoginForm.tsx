import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
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
import { useAuth } from '@/context/AuthContext'
import { login as loginApi } from '@/api/auth'
import ForgotPasswordForm from './ForgotPasswordForm'

const schema = z.object({
  email: z.string().email('Enter a valid email address').endsWith('@epam.com', 'Only @epam.com emails are allowed'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    try {
      const user = await loginApi(values)
      login(user)
      navigate('/')
    } catch {
      setFormError('Invalid email or password.')
    }
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="jane@epam.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="password">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </Form>

    {resetSuccess && (
      <div
        role="status"
        className="mt-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
      >
        Password reset successfully. You can now sign in with your new password.
      </div>
    )}

    <div className="mt-3 text-center">
      <button
        type="button"
        className="text-sm text-slate-500 hover:text-primary transition-colors duration-200 cursor-pointer"
        onClick={() => { setShowForgot((v) => !v); setResetSuccess(false) }}
      >
        {showForgot ? 'Back to sign in' : 'Forgot password?'}
      </button>
    </div>

    {showForgot && (
      <ForgotPasswordForm
        onSuccess={() => {
          setShowForgot(false)
          setResetSuccess(true)
        }}
      />
    )}
    </>
  )
}
