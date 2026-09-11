import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import api from '@/services/api'
import { formatDistanceToNow } from 'date-fns'

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  ai_processed: 'bg-blue-100 text-blue-700',
  merged:     'bg-purple-100 text-purple-700',
  new_issue:  'bg-teal-100 text-teal-700',
  duplicate:  'bg-yellow-100 text-yellow-700',
  closed:     'bg-green-100 text-green-700',
  rejected:   'bg-red-100 text-red-700',
}

export default function MyReportsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => api.get('/reports').then(r => r.data),
  })

  const reports = Array.isArray(data) ? data : []

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My Reports</h1>
      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p>No reports yet. Tap the + button to report an issue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r: {
            id: string; ai_category?: string; status: string; latitude: number;
            longitude: number; created_at: string; image_url?: string; ai_confidence?: number
          }) => (
            <div key={r.id} className="card flex items-center gap-3 cursor-pointer hover:shadow-md"
              onClick={() => navigate(`/citizen/issue/${r.id}`)}>
              {r.image_url ? (
                <img src={`/uploads/${r.image_url}`} className="w-14 h-14 rounded-lg object-cover shrink-0" alt="" />
              ) : (
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm capitalize">
                    {r.ai_category?.replace('_', ' ') || 'Processing...'}
                  </span>
                  {r.ai_confidence && (
                    <span className="text-xs text-gray-400">{Math.round(r.ai_confidence * 100)}% confidence</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
