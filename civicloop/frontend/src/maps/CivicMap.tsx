/**
 * CivicLoop — Leaflet Map component
 * Renders issue markers with severity-based colours.
 */
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface MapIssue {
  id: string
  civic_id: string
  latitude: number
  longitude: number
  severity: string
  priority: string
  status: string
  category?: string
  confirmations: number
  created_at?: string
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

const STATUS_COLOR: Record<string, string> = {
  closed: '#22c55e',
  resolved: '#22c55e',
}

function getColor(issue: MapIssue): string {
  if (['closed', 'resolved'].includes(issue.status)) return STATUS_COLOR[issue.status]
  return SEVERITY_COLOR[issue.severity] || '#6b7280'
}

interface Props {
  issues: MapIssue[]
  center?: [number, number]
  zoom?: number
}

export default function CivicMap({ issues, center = [20.5937, 78.9629], zoom = 5 }: Props) {
  // Auto-center on first issue if available
  const mapCenter: [number, number] = issues.length > 0
    ? [issues[0].latitude, issues[0].longitude]
    : center

  const mapZoom = issues.length > 0 ? 13 : zoom

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {issues.map((issue) => (
        <CircleMarker
          key={issue.id}
          center={[issue.latitude, issue.longitude]}
          radius={issue.priority === 'critical' ? 12 : issue.priority === 'high' ? 10 : 8}
          fillColor={getColor(issue)}
          color={getColor(issue)}
          weight={2}
          opacity={0.9}
          fillOpacity={0.7}
        >
          <Popup>
            <div className="text-sm min-w-32">
              <div className="font-bold capitalize">
                {issue.category?.replace('_', ' ') || 'Unknown'}
              </div>
              <div className="text-blue-600 text-xs font-mono">{issue.civic_id}</div>
              <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                <div>Severity: <span className="capitalize font-medium">{issue.severity}</span></div>
                <div>Status: <span className="capitalize">{issue.status.replace('_', ' ')}</span></div>
                <div>Confirmations: {issue.confirmations}</div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
