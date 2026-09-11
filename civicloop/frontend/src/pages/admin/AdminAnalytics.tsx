import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6']

export default function AdminAnalytics() {
  const { data: stats } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
  })

  if (!stats) return <div className="text-center py-10 text-gray-400">Loading analytics...</div>

  const pieData = [
    { name: 'Pending', value: stats.pending },
    { name: 'In Progress', value: stats.in_progress },
    { name: 'Resolved', value: stats.resolved },
    { name: 'Closed', value: stats.closed },
    { name: 'Overdue', value: stats.overdue },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Issue Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* KPIs */}
        <div className="space-y-3">
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <p className="text-sm opacity-80">Resolution Rate</p>
            <p className="text-5xl font-bold">{stats.resolution_rate}%</p>
          </div>
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <p className="text-sm opacity-80">Avg Resolution Time</p>
            <p className="text-5xl font-bold">{stats.avg_resolution_hours || '—'}h</p>
          </div>
          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <p className="text-sm opacity-80">Total Citizens</p>
            <p className="text-5xl font-bold">{stats.total_citizens?.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
