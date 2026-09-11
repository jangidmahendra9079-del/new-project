import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

export default function CitizenDashboard() {
  const navigate = useNavigate()
  const { userId, accessToken, name } = useAuthStore()

  const { data: myReports, refetch } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => api.get('/reports').then(r => r.data),
  })

  const { data: score } = useQuery({
    queryKey: ['civic-score'],
    queryFn: () => api.get('/civic-score').then(r => r.data).catch(() => null),
  })

  // Live updates
  const { lastMessage } = useWebSocket(`citizen:${userId}`, accessToken)
  useEffect(() => {
    if (lastMessage?.type === 'ISSUE_STATUS_CHANGED') {
      toast.success(`Issue ${lastMessage.civic_id} → ${lastMessage.status}`)
      refetch()
    }
    if (lastMessage?.type === 'ISSUE_ASSIGNED') {
      toast(`Issue ${lastMessage.civic_id} has been assigned!`, { icon: '📋' })
      refetch()
    }
  }, [lastMessage, refetch])

  const reports = Array.isArray(myReports) ? myReports : []
  const pending = reports.filter((r: { status: string }) => !['closed', 'rejected'].includes(r.status))
  const resolved = reports.filter((r: { status: string }) => r.status === 'closed' || r.status === 'resolved')

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    ai_processed: 'bg-blue-100 text-blue-800',
    merged: 'bg-purple-100 text-purple-800',
    new_issue: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-600',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-2xl p-5 text-white">
        <p className="text-blue-100 text-sm">Good day,</p>
        <h2 className="text-2xl font-bold">{name}</h2>
        <p className="text-blue-200 text-sm mt-1">Help improve your city by reporting civic issues</p>
        {score && (
          <div className="mt-3 flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5 w-fit">
            <TrendingUp size={14} />
            <span className="text-sm font-semibold">{score.total_score} Civic Points</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-700">{reports.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Reports</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-500">{pending.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{resolved.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Resolved</div>
        </div>
      </div>

      {/* Report Issue CTA */}
      <button
        onClick={() => navigate('/citizen/report')}
        className="w-full flex items-center justify-center gap-3 bg-blue-700 text-white rounded-2xl py-5 font-bold text-lg shadow-lg hover:bg-blue-800 active:scale-95 transition-all"
      >
        <div className="bg-white/20 rounded-full p-2">
          <Plus size={24} />
        </div>
        REPORT AN ISSUE
      </button>

      {/* Recent reports */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Recent Reports</h3>
          <button onClick={() => navigate('/citizen/reports')} className="text-xs text-blue-600 hover:underline">
            View all
          </button>
        </div>
        {reports.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-40" />
            <p>No reports yet. Be the change!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 5).map((r: {
              id: string; ai_category?: string; status: string; latitude: number; longitude: number; created_at: string; image_url?: string
            }) => (
              <div key={r.id} className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/citizen/issue/${r.id}`)}>
                {r.image_url ? (
                  <img src={`/uploads/${r.image_url}`} className="w-14 h-14 rounded-lg object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm capitalize">{r.ai_category?.replace('_', ' ') || 'Processing...'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status] || 'bg-gray-100 text-gray-600'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Clock size={14} className="text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
