import { goeyToast } from 'goey-toast'
import { useCallback, useEffect, useRef } from 'react'

interface UseLookupToastProps {
  loading: boolean
  hasData: boolean
  open: boolean
  message?: string
}
const TOAST_COOLDOWN_MS = 900

/**
 * Custom hook to show a background activity toast (e.g., "Loading…" or "Searching…")
 * when a lookup is fetching in the background but already has some data visible.
 */
export function useLookupToast({
  loading,
  hasData,
  open,
  message = 'Searching…',
}: UseLookupToastProps) {
  const toastIdRef = useRef<string | number | null>(null)
  const wasLoadingRef = useRef(false)
  const lastToastMessageRef = useRef<string | null>(null)
  const lastToastAtRef = useRef(0)

  const dismissToast = useCallback(() => {
    if (toastIdRef.current !== null) {
      goeyToast.dismiss(toastIdRef.current)
      toastIdRef.current = null
    }
  }, [])

  const showToast = useCallback(() => {
    const now = Date.now()
    const isDuplicateWithinCooldown =
      lastToastMessageRef.current === message && now - lastToastAtRef.current < TOAST_COOLDOWN_MS
    if (isDuplicateWithinCooldown) return

    dismissToast()
    toastIdRef.current = goeyToast(message, { duration: 10000 })
    lastToastMessageRef.current = message
    lastToastAtRef.current = now
  }, [dismissToast, message])

  useEffect(() => {
    const shouldShow = loading && hasData && open

    if (!shouldShow) {
      if (wasLoadingRef.current) {
        dismissToast()
        wasLoadingRef.current = false
      }
      return
    }

    if (!wasLoadingRef.current || toastIdRef.current === null) {
      showToast()
    }
    wasLoadingRef.current = true
  }, [loading, hasData, open, showToast, dismissToast])

  useEffect(
    () => () => {
      dismissToast()
      wasLoadingRef.current = false
    },
    [dismissToast],
  )
}
