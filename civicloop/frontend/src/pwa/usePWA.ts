/**
 * CivicLoop — PWA install prompt + online/offline state
 */
import { useState, useEffect } from 'react'
import { registerOnlineListener } from './offlineSync'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Online/offline tracking
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Auto-sync when back online
    const cleanup = registerOnlineListener()

    // PWA install prompt
    const onInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', onInstall)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onInstall)
      cleanup()
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  return { isOnline, isInstallable, install }
}
