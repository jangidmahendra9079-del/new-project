/**
 * CivicLoop — WebSocket hook
 * Usage: const { lastMessage } = useWebSocket('public')
 *        const { lastMessage } = useWebSocket(`citizen:${userId}`, token)
 */
import { useEffect, useRef, useState, useCallback } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

interface UseWebSocketResult {
  lastMessage: Record<string, unknown> | null
  readyState: number
  sendMessage: (data: unknown) => void
}

export function useWebSocket(room: string, token?: string | null): UseWebSocketResult {
  const wsRef = useRef<WebSocket | null>(null)
  const [lastMessage, setLastMessage] = useState<Record<string, unknown> | null>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    const url = token
      ? `${WS_BASE}/api/v1/ws/${room}?token=${token}`
      : `${WS_BASE}/api/v1/ws/${room}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setReadyState(WebSocket.OPEN)
      // Keep-alive ping every 30s
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30_000)
      ws.addEventListener('close', () => clearInterval(pingInterval))
    }

    ws.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data))
      } catch {
        /* ignore malformed messages */
      }
    }

    ws.onclose = (event) => {
      setReadyState(WebSocket.CLOSED)
      if (event.code !== 4001 && event.code !== 4003) {
        // Reconnect after 3 seconds (not on auth errors)
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [room, token])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close(1000)
    }
  }, [connect])

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { lastMessage, readyState, sendMessage }
}
