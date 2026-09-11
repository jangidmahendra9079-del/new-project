/**
 * CivicLoop — Geolocation hook
 */
import { useState, useEffect } from 'react'

interface GeoState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation(watchMode = false) {
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, loading: false, error: 'Geolocation not supported' }))
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 5_000,
    }

    const onSuccess = (pos: GeolocationPosition) => {
      setState({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        error: null,
        loading: false,
      })
    }

    const onError = (err: GeolocationPositionError) => {
      const msgs: Record<number, string> = {
        1: 'Location permission denied. Please allow access in browser settings.',
        2: 'Location unavailable. Please try again.',
        3: 'Location request timed out.',
      }
      setState((s) => ({
        ...s,
        loading: false,
        error: msgs[err.code] || 'Unable to determine location',
      }))
    }

    let watchId: number
    if (watchMode) {
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, options)
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options)
    }

    return () => {
      if (watchMode && watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [watchMode])

  return state
}
