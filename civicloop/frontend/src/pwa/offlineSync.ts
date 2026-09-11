/**
 * CivicLoop — Offline Sync Service
 * When connectivity returns, flushes pending reports from the offline store.
 */
import api from '@/services/api'
import { useOfflineStore } from '@/store/offlineStore'
import toast from 'react-hot-toast'

async function dataURItoBlob(dataURI: string): Promise<Blob> {
  const res = await fetch(dataURI)
  return res.blob()
}

export async function syncPendingReports(): Promise<void> {
  const { pendingReports, removePending, markSyncing } = useOfflineStore.getState()

  if (pendingReports.length === 0) return

  toast.loading(`Syncing ${pendingReports.length} pending report(s)...`, { id: 'sync' })

  let successCount = 0

  for (const report of pendingReports) {
    markSyncing(report.id, true)
    try {
      const fd = new FormData()
      fd.append('latitude', String(report.latitude))
      fd.append('longitude', String(report.longitude))
      if (report.description) fd.append('description', report.description)
      if (report.imageBase64) {
        const blob = await dataURItoBlob(report.imageBase64)
        fd.append('image', blob, report.imageName || 'photo.jpg')
      }

      await api.post('/reports', fd)
      removePending(report.id)
      successCount++
    } catch {
      markSyncing(report.id, false)
    }
  }

  if (successCount > 0) {
    toast.success(`Synced ${successCount} report(s)!`, { id: 'sync' })
  } else {
    toast.dismiss('sync')
  }
}

export function registerOnlineListener(): () => void {
  const handler = () => {
    if (navigator.onLine) {
      syncPendingReports()
    }
  }
  window.addEventListener('online', handler)
  return () => window.removeEventListener('online', handler)
}
