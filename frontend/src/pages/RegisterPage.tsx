import { Link } from 'react-router-dom'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-heading text-primary">Create Account</h1>
          <p className="mt-2 text-sm text-gray-600">Join the InnovatEpam Portal</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-8">
          <RegisterForm />
        </div>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
