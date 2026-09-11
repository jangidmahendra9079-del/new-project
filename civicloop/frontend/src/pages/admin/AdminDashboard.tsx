import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Users, Activity } from 'lucide-react'

export default function AdminDashboard() {
  const { accessToken } = useAuthStore()
  const qc = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { default: api } = await import('@/services/api')
      return api.get('/admin/dashboard').then(r => r.data)
    },
    refetchInterval: 30_000,
  })

  const { data: alerts } = useQuery({
    queryKey: ['recurrence-alerts'],
    queryFn: async () => {
      const { default: api } = await import('@/services/api')
      return api.get('/admin/recurrence-alerts').then(r => r.data)
    },
  })

  // Live dashboard updates via WebSocket
  const { lastMessage } = useWebSocket('admin', accessToken)
  useEffect(() => {
    if (lastMessage?.type && ['ISSUE_STATUS_CHANGED', 'ISSUE_ASSIGNED', 'ISSUE_OVERDUE'].includes(lastMessage.type as string)) {
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
    }
  }, [lastMessage, qc])

  if (!stats) return <div className="text-gray-400 text-center py-20">Loading dashboard...</div>

  const chartData = [
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'In Progress', value: stats.in_progress, color: '#3b82f6' },
    { name: 'Closed', value: stats.closed, color: '#22c55e' },
    { name: 'Overdue', value: stats.overdue, color: '#ef4444' },
  ]

  const statCards = [
    { label: 'Total Issues', value: stats.total_issues, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending', value: stats.pending, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'In Progress', value: stats.in_progress, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Closed', value: stats.closed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Citizens', value: stats.total_citizens, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CivicLoop Admin</h1>
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-0.5">{value?.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl ${bg}`}>
                <Icon size={22} className={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resolution Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-1">Resolution Rate</h3>
          <div className="text-5xl font-bold text-green-600">{stats.resolution_rate}%</div>
          <div className="w-full bg-gray-100 rounded-full h-3 mt-3">
            <div className="bg-green-500 h-3 rounded-full" style={{ width: `${stats.resolution_rate}%` }} />
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-1">Avg Resolution Time</h3>
          <div className="text-5xl font-bold text-blue-600">
            {stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : '—'}
          </div>
          <p className="text-xs text-gray-400 mt-2">Average from assignment to closure</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">Issue Breakdown</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recurrence Alerts */}
      {Array.isArray(alerts) && alerts.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Recurring Issues Detected
          </h3>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((a: {
              id: number; category: string; ward_id?: number;
              occurrence_count: number; period_months: number; description?: string
            }) => (
              <div key={a.id} className="bg-white rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{a.category.replace('_', ' ')}</span>
                  {a.ward_id && <span className="text-gray-400">Ward {a.ward_id}</span>}
                </div>
                <p className="text-amber-700 text-xs mt-0.5">
                  {a.occurrence_count} occurrences in {a.period_months} months — Root cause investigation recommended
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
