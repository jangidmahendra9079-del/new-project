import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, CheckCircle, Clock, AlertTriangle, Activity, LogIn } from 'lucide-react'
import CivicMap from '@/maps/CivicMap'
import api from '@/services/api'

export default function PublicDashboard() {
  const qc = useQueryClient()
  const [wardFilter, setWardFilter] = useState<number | undefined>()

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['public-stats', wardFilter],
    queryFn: () => api.get(`/public/stats${wardFilter ? `?ward_id=${wardFilter}` : ''}`).then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: mapIssues, refetch: refetchMap } = useQuery({
    queryKey: ['public-map'],
    queryFn: () => api.get('/public/map-issues').then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: wards } = useQuery({
    queryKey: ['public-wards'],
    queryFn: () => api.get('/public/wards').then(r => r.data),
  })

  // Live updates
  const { lastMessage } = useWebSocket('public')
  useEffect(() => {
    if (lastMessage?.type === 'ISSUE_STATUS_CHANGED') {
      refetchStats()
      refetchMap()
    }
  }, [lastMessage, refetchStats, refetchMap])

  const issues = Array.isArray(mapIssues) ? mapIssues : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <MapPin size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold">CivicLoop</h1>
              <p className="text-blue-200 text-xs">Public Civic Dashboard</p>
            </div>
          </div>
          <Link to="/login" className="flex items-center gap-2 bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50">
            <LogIn size={16} /> Sign In
          </Link>
        </div>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Issues', value: stats.total_issues, icon: Activity, color: 'text-blue-600' },
              { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-green-600' },
              { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600' },
              { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600' },
              { label: 'Resolution Rate', value: `${stats.resolution_rate}%`, icon: Activity, color: 'text-purple-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center">
                <Icon size={16} className={`mx-auto mb-1 ${color}`} />
                <div className="text-lg font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Ward filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filter by Ward:</label>
          <select
            value={wardFilter || ''}
            onChange={e => setWardFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
            <option value="">All Wards</option>
            {(Array.isArray(wards) ? wards : []).map((w: { id: number; name: string; ward_number: number }) => (
              <option key={w.id} value={w.id}>Ward {w.ward_number} — {w.name}</option>
            ))}
          </select>
        </div>

        {/* Map legend */}
        <div className="flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">🔴 Critical</span>
          <span className="flex items-center gap-1">🟠 High</span>
          <span className="flex items-center gap-1">🟡 Medium</span>
          <span className="flex items-center gap-1">🟢 Resolved</span>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200" style={{ height: '500px' }}>
          <CivicMap issues={issues} />
        </div>

        {/* Issue list */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Issues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {issues.slice(0, 10).map((issue: {
              id: string; civic_id: string; category?: string; severity: string;
              status: string; confirmations: number; created_at?: string
            }) => (
              <div key={issue.id} className="card flex items-center gap-3">
                <div className="text-2xl">
                  {issue.status === 'closed' ? '🟢' :
                   issue.severity === 'critical' ? '🔴' :
                   issue.severity === 'high' ? '🟠' : '🟡'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm capitalize">{issue.category?.replace('_', ' ') || 'Unknown'}</span>
                    <span className="text-xs text-blue-600 font-mono">{issue.civic_id}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {issue.confirmations} confirmations · {issue.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-400">
        CivicLoop — AI-powered civic accountability platform
        <br />
        <Link to="/login" className="text-blue-500 hover:underline">Sign in to report issues</Link>
      </footer>
    </div>
  )
}
