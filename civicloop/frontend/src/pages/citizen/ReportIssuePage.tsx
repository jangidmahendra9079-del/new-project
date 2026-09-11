import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, Upload, CheckCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useOfflineStore } from '@/store/offlineStore'

type AiResult = { category: string; severity: string; confidence: number; reason: string } | null

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-green-600 bg-green-50 border-green-200',
}

const CATEGORIES = ['pothole', 'garbage', 'streetlight', 'water_leak', 'drainage', 'road_damage', 'encroachment', 'other']

export default function ReportIssuePage() {
  const navigate = useNavigate()
  const { latitude, longitude, error: geoError, loading: geoLoading } = useGeolocation()
  const { addPending } = useOfflineStore()

  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [aiResult, setAiResult] = useState<AiResult>(null)
  const [humanCategory, setHumanCategory] = useState('')
  const [humanSeverity, setHumanSeverity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'capture' | 'review' | 'submitted'>('capture')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleImage = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB')
      return
    }
    setImage(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const submitReport = useCallback(async () => {
    if (!image) {
      toast.error('Please capture or upload a photo')
      return
    }
    if (!latitude || !longitude) {
      toast.error(geoError || 'Waiting for GPS...')
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('latitude', String(latitude))
      fd.append('longitude', String(longitude))
      fd.append('image', image)
      if (description) fd.append('description', description)
      if (humanCategory) fd.append('human_category', humanCategory)
      if (humanSeverity) fd.append('human_severity', humanSeverity)

      await api.post('/reports', fd)
      setStep('submitted')
      toast.success('Report submitted! AI is processing it.')
      setTimeout(() => navigate('/citizen'), 2000)
    } catch {
      // Offline — queue for later sync
      if (!navigator.onLine) {
        addPending({ latitude, longitude, description, imageBase64: imagePreview || undefined })
        toast.success('Saved offline. Will sync when connected.')
        navigate('/citizen')
      } else {
        toast.error('Submission failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }, [image, latitude, longitude, description, humanCategory, humanSeverity, geoError, imagePreview, addPending, navigate])

  if (step === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Report Submitted!</h2>
          <p className="text-gray-500 mt-2">AI is analyzing your report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-xl font-bold text-gray-900">Report an Issue</h1>
        {!navigator.onLine && <WifiOff size={16} className="text-orange-500 ml-auto" />}
      </div>

      {/* GPS Status */}
      <div className={`card flex items-center gap-3 ${latitude ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
        <MapPin size={18} className={latitude ? 'text-green-600' : 'text-orange-600'} />
        <div className="text-sm">
          {geoLoading ? (
            <span className="text-gray-500">Getting your location...</span>
          ) : latitude ? (
            <span className="text-green-700 font-medium">GPS captured: {latitude.toFixed(5)}, {longitude?.toFixed(5)}</span>
          ) : (
            <span className="text-orange-700">{geoError || 'Location unavailable'}</span>
          )}
        </div>
      </div>

      {/* Image capture */}
      {!imagePreview ? (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center bg-white">
            <Camera size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4 text-sm">Take a photo or upload an image</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => cameraInputRef.current?.click()} className="btn-primary flex items-center gap-2">
                <Camera size={16} /> Camera
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2">
                <Upload size={16} /> Upload
              </button>
            </div>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => e.target.files?.[0] && handleImage(e.target.files[0])} />
        </div>
      ) : (
        <div className="relative">
          <img src={imagePreview} className="w-full h-56 object-cover rounded-2xl" alt="captured" />
          <button onClick={() => { setImage(null); setImagePreview(null); setAiResult(null) }}
            className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Retake
          </button>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="input resize-none h-20"
          placeholder="Describe the issue in your own words..."
          maxLength={500}
        />
      </div>

      {/* AI Result preview (would be populated after upload in real flow) */}
      <div className="card border-blue-100 bg-blue-50">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium text-blue-800">AI will analyze your photo</span>
        </div>
        <p className="text-xs text-blue-600">
          After submission, Gemini Vision will automatically detect: category, severity, and confidence.
          You can override if needed.
        </p>
      </div>

      {/* Manual category override */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category Override (optional)</label>
        <select value={humanCategory} onChange={e => setHumanCategory(e.target.value)} className="input">
          <option value="">Let AI decide</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Severity Override (optional)</label>
        <select value={humanSeverity} onChange={e => setHumanSeverity(e.target.value)} className="input">
          <option value="">Let AI decide</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <button
        onClick={submitReport}
        disabled={!image || (!latitude && !navigator.onLine === false) || submitting}
        className="btn-primary w-full py-4 text-lg font-bold"
      >
        {submitting ? 'Submitting...' : '🚀 Submit Report'}
      </button>

      <p className="text-xs text-center text-gray-400">
        If offline, your report will be saved locally and synced automatically when connection returns.
      </p>
    </div>
  )
}
