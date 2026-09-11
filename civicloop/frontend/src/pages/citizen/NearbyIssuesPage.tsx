import { useQuery } from '@tanstack/react-query'
import { MapPin, AlertTriangle, Users, CheckCircle } from 'lucide-react'
import api from '@/services/api'
import { useGeolocation } from '@/hooks/useGeolocation'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢',
}

export default function NearbyIssuesPage() {
  const { latitude, longitude, loading, error } = useGeolocation()
  const navigate = useNavigate()

  const { data: issues, refetch } = useQuery({
    queryKey: ['nearby', latitude, longitude],
    queryFn: () =>
      api.get(`/issues/nearby/me?latitude=${latitude}&longitude=${longitude}&radius_meters=1000`)
        .then(r => r.data),
    enabled: !!latitude && !!longitude,
  })

  const confirm = async (issueId: string) => {
    try {
      await api.post(`/issues/${issueId}/confirm`, {})
      toast.success('+5 Civic Points! Confirmation recorded.')
      refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg || 'Already confirmed or error')
    }
  }

  const nearbyIssues = Array.isArray(issues) ? issues : []

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <MapPin className="text-blue-600" size={22} />
        Issues Near You
      </h1>

      {loading && (
        <div className="card text-center py-8 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
          Getting your location...
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {latitude && longitude && nearbyIssues.length === 0 && !loading && (
        <div className="card text-center py-8 text-gray-400">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-40" />
          <p>No open issues found within 1 km. Your area looks clean!</p>
        </div>
      )}

      {nearbyIssues.map((issue: {
        id: string; civic_id: string; ai_category?: string; severity: string;
        priority: string; confirmation_count: number; status: string; latitude: number;
        longitude: number; image_url?: string
      }) => {
        const dist = latitude && longitude
          ? Math.round(Math.sqrt(
              Math.pow((issue.latitude - latitude) * 111320, 2) +
              Math.pow((issue.longitude - longitude) * 111320 * 0.85, 2)
            ))
          : null

        return (
          <div key={issue.id} className="card hover:shadow-md transition-shadow">
            <div className="flex gap-3">
              {issue.image_url ? (
                <img src={`/uploads/${issue.image_url}`} className="w-16 h-16 rounded-lg object-cover shrink-0" alt="" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{SEVERITY_ICON[issue.severity] || '⚪'}</span>
                  <span className="font-semibold capitalize text-sm">
                    {issue.ai_category?.replace('_', ' ') || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-400">{issue.civic_id}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  {dist !== null && <span><MapPin size={12} className="inline" /> {dist}m away</span>}
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {issue.confirmation_count} confirmed
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate(`/citizen/issue/${issue.id}`)}
                className="flex-1 btn-secondary text-sm py-1.5">
                View Details
              </button>
              {!['closed', 'rejected'].includes(issue.status) && (
                <button
                  onClick={() => confirm(issue.id)}
                  className="flex-1 btn-primary text-sm py-1.5">
                  ✓ Confirm Issue
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
