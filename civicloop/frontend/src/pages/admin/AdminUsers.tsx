import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { UserCheck, UserX } from 'lucide-react'

const ROLE_BADGE: Record<string, string> = {
  citizen: 'bg-blue-100 text-blue-700',
  field_officer: 'bg-teal-100 text-teal-700',
  department_officer: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-red-100 text-red-700',
}

export default function AdminUsers() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  })

  const toggleMut = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      api.patch(`/admin/users/${userId}`, { is_active: isActive }),
    onSuccess: () => { toast.success('User updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
  })

  const roleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.patch(`/admin/users/${userId}`, { role }),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
  })

  const users = data?.users || []

  if (isLoading) return <div className="text-center py-10 text-gray-400">Loading users...</div>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">User Management</h1>
      <p className="text-sm text-gray-500">{users.length} users</p>

      <div className="space-y-3">
        {users.map((u: {
          id: string; name: string; email?: string; mobile?: string;
          role: string; is_active: boolean; created_at: string
        }) => (
          <div key={u.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                  {!u.is_active && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{u.email || u.mobile}</p>
                <p className="text-xs text-gray-300">Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  defaultValue={u.role}
                  onChange={e => roleMut.mutate({ userId: u.id, role: e.target.value })}
                  className="text-xs border rounded px-1 py-1">
                  <option value="citizen">Citizen</option>
                  <option value="field_officer">Field Officer</option>
                  <option value="department_officer">Dept Officer</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <button
                  onClick={() => toggleMut.mutate({ userId: u.id, isActive: !u.is_active })}
                  className={`p-2 rounded-lg ${u.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}>
                  {u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
