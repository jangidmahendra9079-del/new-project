import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { Building2, Plus } from 'lucide-react'

export default function AdminDepartments() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '', contact_email: '' })

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/admin/departments').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data: typeof form) => api.post('/admin/departments', data),
    onSuccess: () => {
      toast.success('Department created')
      qc.invalidateQueries({ queryKey: ['departments'] })
      setShowForm(false)
      setForm({ name: '', code: '', description: '', contact_email: '' })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Departments</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {showForm && (
        <div className="card border-blue-200 bg-blue-50 space-y-3">
          <h3 className="font-semibold text-blue-900">New Department</h3>
          {(['name', 'code', 'description', 'contact_email'] as const).map(field => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">{field.replace('_', ' ')}</label>
              <input
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="input text-sm"
              />
            </div>
          ))}
          <button onClick={() => createMut.mutate(form)} className="btn-primary text-sm">
            Create
          </button>
        </div>
      )}

      <div className="space-y-3">
        {(Array.isArray(depts) ? depts : []).map((d: {
          id: number; name: string; code: string; description?: string; contact_email?: string; is_active: boolean
        }) => (
          <div key={d.id} className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{d.code}</span>
                {!d.is_active && <span className="text-xs text-red-500">Inactive</span>}
              </div>
              {d.description && <p className="text-xs text-gray-400 mt-0.5">{d.description}</p>}
              {d.contact_email && <p className="text-xs text-blue-500">{d.contact_email}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
