/**
 * CivicLoop — Offline Report Queue (Zustand + IndexedDB via idb)
 */
import { create } from 'zustand'

export interface PendingReport {
  id: string
  latitude: number
  longitude: number
  description?: string
  imageBase64?: string
  imageName?: string
  timestamp: number
  syncing?: boolean
}

interface OfflineState {
  pendingReports: PendingReport[]
  addPending: (report: Omit<PendingReport, 'id' | 'timestamp'>) => void
  removePending: (id: string) => void
  markSyncing: (id: string, syncing: boolean) => void
}

let counter = 0
const genId = () => `offline-${Date.now()}-${++counter}`

export const useOfflineStore = create<OfflineState>((set) => ({
  pendingReports: [],

  addPending: (report) =>
    set((s) => ({
      pendingReports: [
        ...s.pendingReports,
        { ...report, id: genId(), timestamp: Date.now() },
      ],
    })),

  removePending: (id) =>
    set((s) => ({ pendingReports: s.pendingReports.filter((r) => r.id !== id) })),

  markSyncing: (id, syncing) =>
    set((s) => ({
      pendingReports: s.pendingReports.map((r) =>
        r.id === id ? { ...r, syncing } : r
      ),
    })),
}))
