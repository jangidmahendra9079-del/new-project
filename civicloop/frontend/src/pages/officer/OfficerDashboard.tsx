import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Clock, MapPin, AlertTriangle, ChevronRight } from 'lucide-react'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatDistanceToNow, differenceInHours } from 'date-fns'

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'border-l-red-600 bg-red-50',
  high: 'border-l-orange-500 bg-orange-50',
  medium: 'border-l-yellow-400 bg-yellow-50',
  low: 'border-l-green-500 bg-green-50',
}

export default function OfficerDashboard() {
  const { userId, accessToken } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['officer-assignments'],
    queryFn: () => api.get('/officer/assignments').then(r => r.data),
  })

  // Live updates from WebSocket
  const { lastMessage } = useWebSocket(`user:${userId}`, accessToken)
  useEffect(() => {
    if (lastMessage?.type === 'ISSUE_ASSIGNED') {
      toast.success(`New issue assigned: ${lastMessage.civic_id}`)
      refetch()
    }
  }, [lastMessage, refetch])

  const acceptMut = useMutation({
    mutationFn: (id: number) => api.post(`/officer/assignments/${id}/accept`),
    onSuccess: () => { toast.success('Assignment accepted!'); qc.invalidateQueries({ queryKey: ['officer-assignments'] }) },
  })
  const startMut = useMutation({
    mutationFn: (id: number) => api.post(`/officer/assignments/${id}/start`),
    onSuccess: () => { toast.success('Work started!'); qc.invalidateQueries({ queryKey: ['officer-assignments'] }) },
  })

  const assignments = Array.isArray(data) ? data : []

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading assignments...</div>
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Assignments</h1>
        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
          {assignments.length} active
        </span>
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p>No active assignments. Check back later.</p>
        </div>
      )}

      {assignments.map((a: {
        assignment_id: number; assignment_status: string;
        issue: {
          id: string; civic_id: string; title: string; severity: string; priority: string;
          status: string; latitude?: number; longitude?: number; image_url?: string;
          sla_deadline?: string; ward_id?: number; confirmation_count: number
        }
      }) => {
        const { issue } = a
        const slaHoursLeft = issue.sla_deadline
          ? differenceInHours(new Date(issue.sla_deadline), new Date())
          : null
        const slaUrgent = slaHoursLeft !== null && slaHoursLeft < 6

        return (
          <div key={a.assignment_id}
            className={`card border-l-4 ${PRIORITY_COLORS[issue.priority] || 'border-l-gray-300'}`}>
            <div className="flex items-start gap-3">
              {issue.image_url ? (
                <img src={`/uploads/${issue.image_url}`} className="w-16 h-16 rounded-lg object-cover shrink-0" alt="" />
              ) : (
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shrink-0 border">
                  <AlertTriangle size={20} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge-${issue.priority}`}>{issue.priority.toUpperCase()}</span>
                  <span className="text-xs text-gray-500">{issue.civic_id}</span>
                </div>
                <h3 className="font-semibold text-gray-900 mt-1">{issue.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {issue.ward_id && <span><MapPin size={12} className="inline" /> Ward {issue.ward_id}</span>}
                  <span>{issue.confirmation_count} confirmations</span>
                  {slaHoursLeft !== null && (
                    <span className={slaUrgent ? 'text-red-600 font-bold' : 'text-gray-500'}>
                      <Clock size={12} className="inline" /> {slaHoursLeft > 0 ? `${slaHoursLeft}h left` : 'OVERDUE'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {a.assignment_status === 'pending' && (
                <button onClick={() => acceptMut.mutate(a.assignment_id)}
                  disabled={acceptMut.isPending}
                  className="btn-secondary text-sm py-2 flex-1">
                  Accept
                </button>
              )}
              {(a.assignment_status === 'accepted' || a.assignment_status === 'pending') && (
                <button onClick={() => startMut.mutate(a.assignment_id)}
                  disabled={startMut.isPending}
                  className="btn-primary text-sm py-2 flex-1">
                  Start Work
                </button>
              )}
              <button onClick={() => navigate(`/officer/assignment/${a.assignment_id}`)}
                className="btn-secondary text-sm py-2 px-3">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
