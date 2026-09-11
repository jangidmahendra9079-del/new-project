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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  mobile: z.string().regex(/^\+?[0-9\s-]{7,20}$/, 'Please enter a valid mobile number').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.email || d.mobile, {
  message: 'Please provide either an email or mobile number',
  path: ['email'],
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const cleanMobile = data.mobile ? data.mobile.replace(/[\s-]+/g, '') : undefined
      const payload = {
        name: data.name.trim(),
        email: data.email?.trim() || undefined,
        mobile: cleanMobile || undefined,
        password: data.password,
      }
      const res = await api.post('/auth/register', payload)
      setAuth(res.data)
      const userName = res.data.name || res.data.user?.name || data.name
      toast.success(`Account created! Welcome to CivicLoop, ${userName} 🎉`)
      navigate('/citizen')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed. Please try again.'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <MapPin className="w-8 h-8 text-blue-700" />
          </div>
          <h1 className="text-3xl font-bold text-white">CivicLoop</h1>
          <p className="text-blue-200 mt-1 text-sm">Join your civic community</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input {...register('name')} className="input" placeholder="Mahendra Jangid" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile (optional)</label>
              <input {...register('mobile')} className="input" placeholder="+91 98765 43210" />
              {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-base">
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
