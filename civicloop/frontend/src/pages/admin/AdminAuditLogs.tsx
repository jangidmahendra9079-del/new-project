import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'

export default function AdminAuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/admin/audit-logs').then(r => r.data),
  })

  const logs = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <FileText size={22} /> Audit Logs
      </h1>
      <p className="text-sm text-gray-500">Every sensitive action is logged for accountability.</p>

      {isLoading && <div className="text-center py-10 text-gray-400">Loading...</div>}

      <div className="space-y-2">
        {logs.map((log: {
          id: number; action: string; entity_type: string; entity_id?: string;
          description?: string; ip_address?: string; created_at: string;
          old_value?: Record<string, unknown>; new_value?: Record<string, unknown>
        }) => (
          <div key={log.id} className="card text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{log.action}</span>
                <span className="text-gray-600">{log.entity_type}</span>
                {log.entity_id && <span className="text-xs text-gray-400 truncate max-w-24">{log.entity_id}</span>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {format(new Date(log.created_at), 'MMM d, HH:mm')}
              </span>
            </div>
            {log.description && <p className="text-gray-500 mt-1 text-xs">{log.description}</p>}
            {(log.old_value || log.new_value) && (
              <div className="mt-2 flex gap-3 text-xs">
                {log.old_value && (
                  <div className="bg-red-50 text-red-700 px-2 py-1 rounded flex-1 font-mono truncate">
                    - {JSON.stringify(log.old_value)}
                  </div>
                )}
                {log.new_value && (
                  <div className="bg-green-50 text-green-700 px-2 py-1 rounded flex-1 font-mono truncate">
                    + {JSON.stringify(log.new_value)}
                  </div>
                )}
              </div>
            )}
            {log.ip_address && <p className="text-xs text-gray-300 mt-1">IP: {log.ip_address}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
