import { Link } from 'react-router-dom'
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-heading text-primary">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to InnovatEpam Portal</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8">
          <LoginForm />
        </div>
        <p className="text-center text-sm text-gray-600">
          New employee?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
