import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { ArrowLeft, Camera, Upload, CheckCircle, MapPin } from 'lucide-react'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { useGeolocation } from '@/hooks/useGeolocation'

export default function OfficerAssignmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { latitude, longitude } = useGeolocation()

  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef = useRef<HTMLInputElement>(null)

  const { data: assignment } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () =>
      api.get('/officer/assignments').then(r =>
        (r.data as { assignment_id: number }[]).find((a) => String(a.assignment_id) === id)
      ),
  })

  const resolve = async () => {
    if (!afterFile) {
      toast.error('After photo is required')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      if (beforeFile) fd.append('before_photo', beforeFile)
      fd.append('after_photo', afterFile)
      if (notes) fd.append('notes', notes)
      if (latitude) fd.append('latitude', String(latitude))
      if (longitude) fd.append('longitude', String(longitude))

      await api.post(`/officer/assignments/${id}/resolve`, fd)
      toast.success('Resolution submitted! Awaiting citizen verification.')
      qc.invalidateQueries({ queryKey: ['officer-assignments'] })
      navigate('/officer')
    } catch {
      toast.error('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const issue = (assignment as { issue?: { civic_id: string; title: string; image_url?: string; latitude?: number; longitude?: number; ai_category?: string } })?.issue

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
        <ArrowLeft size={18} /> Back
      </button>

      {issue && (
        <div className="card">
          {issue.image_url && (
            <img src={`/uploads/${issue.image_url}`} className="w-full h-48 object-cover rounded-xl mb-3" alt="Before" />
          )}
          <h2 className="text-lg font-bold capitalize">{issue.ai_category?.replace('_', ' ') || issue.title}</h2>
          <p className="text-xs text-gray-500 mt-1">{issue.civic_id}</p>
          {issue.latitude && (
            <a
              href={`https://maps.google.com/?q=${issue.latitude},${issue.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 text-xs mt-2 hover:underline">
              <MapPin size={12} /> Open in Google Maps
            </a>
          )}
        </div>
      )}

      {/* Resolution form */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-900">Submit Resolution Proof</h3>

        {/* Before photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Before Photo (optional)</label>
          {beforeFile ? (
            <div className="relative">
              <img src={URL.createObjectURL(beforeFile)} className="w-full h-36 object-cover rounded-lg" alt="before" />
              <button onClick={() => setBeforeFile(null)} className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded">Remove</button>
            </div>
          ) : (
            <button onClick={() => beforeRef.current?.click()} className="btn-secondary w-full flex items-center justify-center gap-2 py-3">
              <Camera size={16} /> Add Before Photo
            </button>
          )}
          <input ref={beforeRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => e.target.files?.[0] && setBeforeFile(e.target.files[0])} />
        </div>

        {/* After photo — required */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            After Photo <span className="text-red-500">*</span>
          </label>
          {afterFile ? (
            <div className="relative">
              <img src={URL.createObjectURL(afterFile)} className="w-full h-36 object-cover rounded-lg" alt="after" />
              <button onClick={() => setAfterFile(null)} className="absolute top-1 right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded">Remove</button>
            </div>
          ) : (
            <button onClick={() => afterRef.current?.click()} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              <Camera size={16} /> Capture After Photo
            </button>
          )}
          <input ref={afterRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => e.target.files?.[0] && setAfterFile(e.target.files[0])} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            className="input resize-none h-20" placeholder="Describe work done..." />
        </div>

        {latitude && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <MapPin size={12} /> Resolution GPS: {latitude.toFixed(5)}, {longitude?.toFixed(5)}
          </p>
        )}

        <button onClick={resolve} disabled={submitting || !afterFile}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          <CheckCircle size={18} />
          {submitting ? 'Submitting...' : 'Submit Resolution'}
        </button>
      </div>
    </div>
  )
}
