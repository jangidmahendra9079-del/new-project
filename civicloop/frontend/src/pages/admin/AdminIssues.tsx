import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { AlertTriangle, ChevronRight, Users } from 'lucide-react'

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low',
}

export default function AdminIssues() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [assignOfficer, setAssignOfficer] = useState<{ issueId: string; officerId: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-issues', statusFilter],
    queryFn: () => api.get(`/admin/issues${statusFilter ? `?issue_status=${statusFilter}` : ''}`).then(r => r.data),
  })

  const { data: officers } = useQuery({
    queryKey: ['admin-users-officers'],
    queryFn: () => api.get('/admin/users?role=field_officer').then(r => r.data),
  })

  const assignMut = useMutation({
    mutationFn: ({ issueId, officerId }: { issueId: string; officerId: string }) =>
      api.post(`/admin/issues/${issueId}/assign`, { officer_id: officerId }),
    onSuccess: () => {
      toast.success('Issue assigned!')
      qc.invalidateQueries({ queryKey: ['admin-issues'] })
      setAssignOfficer(null)
    },
    onError: () => toast.error('Assignment failed'),
  })

  const escalateMut = useMutation({
    mutationFn: (issueId: string) => api.post(`/admin/issues/${issueId}/escalate`),
    onSuccess: () => { toast.success('Issue escalated!'); qc.invalidateQueries({ queryKey: ['admin-issues'] }) },
  })

  const issues = data?.issues || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Issues Management</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'reported', 'ai_verified', 'assigned', 'in_progress', 'overdue', 'closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-10 text-gray-400">Loading...</div>}

      <div className="space-y-3">
        {issues.map((issue: {
          id: string; civic_id: string; title: string; severity: string; priority: string;
          status: string; confirmation_count: number; created_at: string; image_url?: string;
          ward_id?: number; department_id?: number; sla_deadline?: string
        }) => (
          <div key={issue.id} className="card hover:shadow-md">
            <div className="flex items-start gap-3">
              {issue.image_url ? (
                <img src={`/uploads/${issue.image_url}`} className="w-14 h-14 rounded-lg object-cover shrink-0" alt="" />
              ) : (
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={PRIORITY_BADGE[issue.priority]}>{issue.priority.toUpperCase()}</span>
                  <span className="text-xs text-blue-600 font-mono">{issue.civic_id}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{issue.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mt-1">{issue.title}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  {issue.ward_id && <span>Ward {issue.ward_id}</span>}
                  <span className="flex items-center gap-1"><Users size={10} /> {issue.confirmation_count}</span>
                  <span>{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              <select
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                onChange={e => e.target.value && setAssignOfficer({ issueId: issue.id, officerId: e.target.value })}
                defaultValue="">
                <option value="">Assign officer...</option>
                {(officers?.users || []).map((o: { id: string; name: string }) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              {assignOfficer?.issueId === issue.id && (
                <button onClick={() => assignMut.mutate(assignOfficer)} className="btn-primary text-xs py-1.5 px-3">
                  Confirm Assign
                </button>
              )}
              <button onClick={() => escalateMut.mutate(issue.id)} className="btn-secondary text-xs py-1.5">
                Escalate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
