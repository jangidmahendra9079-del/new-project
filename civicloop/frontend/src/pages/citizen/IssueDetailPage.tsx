import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Clock, Users, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'

const STATUS_STEPS = [
  'reported', 'ai_verified', 'assigned', 'in_progress',
  'resolution_pending', 'citizen_verification', 'closed',
]

const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  ai_verified: 'AI Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolution_pending: 'Resolution Pending',
  citizen_verification: 'Awaiting Your Verification',
  closed: 'Closed ✓',
  reopened: 'Reopened',
  overdue: 'Overdue',
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => api.get(`/issues/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const { data: history } = useQuery({
    queryKey: ['issue-history', id],
    queryFn: () => api.get(`/issues/${id}/history`).then(r => r.data),
    enabled: !!id,
  })

  const verifyMut = useMutation({
    mutationFn: (isFixed: boolean) =>
      api.post(`/issues/${id}/verify-resolution`, { is_fixed: isFixed }),
    onSuccess: (_, isFixed) => {
      toast.success(isFixed ? 'Great! Issue marked as resolved.' : 'Issue reopened for review.')
      qc.invalidateQueries({ queryKey: ['issue', id] })
      qc.invalidateQueries({ queryKey: ['my-reports'] })
    },
    onError: () => toast.error('Verification failed'),
  })

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
  }
  if (!issue) {
    return <div className="p-4 text-center text-gray-400">Issue not found</div>
  }

  const statusIdx = STATUS_STEPS.indexOf(issue.status)
  const awaitingVerification = issue.status === 'citizen_verification'

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Header */}
      <div className="card">
        {issue.image_url && (
          <img src={`/uploads/${issue.image_url}`} className="w-full h-48 object-cover rounded-xl mb-4" alt="" />
        )}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{issue.civic_id}</span>
            <h2 className="text-xl font-bold mt-1 capitalize">
              {issue.ai_category?.replace('_', ' ') || issue.title}
            </h2>
          </div>
          <div className={`badge-${issue.severity}`}>{issue.severity}</div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Users size={14} /> {issue.confirmation_count} confirmations</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
        </div>
        {issue.ai_reason && (
          <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-2 italic">{issue.ai_reason}</p>
        )}
      </div>

      {/* Status progress */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-3">Status Progress</h3>
        <div className="space-y-2">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className={`flex items-center gap-3 py-1
              ${i < statusIdx ? 'opacity-50' : i === statusIdx ? 'font-semibold' : 'opacity-30'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0
                ${i < statusIdx ? 'bg-green-500 text-white' :
                  i === statusIdx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < statusIdx ? '✓' : i + 1}
              </div>
              <span className="text-sm">{STATUS_LABELS[step] || step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SLA */}
      {issue.sla_deadline && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              SLA Deadline: {format(new Date(issue.sla_deadline), 'MMM d, HH:mm')}
            </span>
          </div>
        </div>
      )}

      {/* Citizen Verification */}
      {awaitingVerification && (
        <div className="card border-2 border-blue-300 bg-blue-50">
          <h3 className="font-bold text-blue-900 text-lg mb-2">Was this actually fixed?</h3>
          <p className="text-sm text-blue-700 mb-4">
            The field officer has marked this issue as resolved. Please verify.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => verifyMut.mutate(true)}
              disabled={verifyMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700">
              <CheckCircle size={18} /> YES, FIXED
            </button>
            <button
              onClick={() => verifyMut.mutate(false)}
              disabled={verifyMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-semibold py-3 rounded-xl hover:bg-red-700">
              <XCircle size={18} /> NO, STILL EXISTS
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {Array.isArray(history) && history.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Activity History</h3>
          <div className="space-y-3">
            {history.map((h: { id: number; new_status: string; note?: string; created_at: string }) => (
              <div key={h.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
                <div>
                  <span className="font-medium capitalize">{h.new_status.replace('_', ' ')}</span>
                  {h.note && <p className="text-gray-500 text-xs">{h.note}</p>}
                  <p className="text-gray-400 text-xs">{format(new Date(h.created_at), 'MMM d, HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
