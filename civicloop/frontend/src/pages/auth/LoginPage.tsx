import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { MapPin, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  identifier: z.string().min(1, 'Email or mobile required'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const cleanIdentifier = data.identifier.trim()
      const isEmail = cleanIdentifier.includes('@')
      const payload = {
        identifier: cleanIdentifier,
        email: isEmail ? cleanIdentifier.toLowerCase() : undefined,
        mobile: !isEmail ? cleanIdentifier.replace(/[\s-]+/g, '') : undefined,
        password: data.password,
      }
      const res = await api.post('/auth/login', payload)
      setAuth(res.data)
      const role: string = res.data.role || res.data.user?.role || 'citizen'
      const userName: string = res.data.name || res.data.user?.name || 'User'
      toast.success(`Welcome back, ${userName}!`)
      if (role === 'citizen') navigate('/citizen')
      else if (role === 'field_officer') navigate('/officer')
      else navigate('/admin')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Invalid email/mobile or password'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <MapPin className="w-8 h-8 text-blue-700" />
          </div>
          <h1 className="text-3xl font-bold text-white">CivicLoop</h1>
          <p className="text-blue-200 mt-1 text-sm">AI-powered civic accountability</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or Mobile</label>
              <input
                {...register('identifier')}
                className="input"
                placeholder="you@example.com or +91..."
                autoComplete="username"
              />
              {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">Register</Link>
            </p>
            <Link to="/public" className="text-xs text-gray-400 hover:text-gray-600 block">
              View public dashboard without logging in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
