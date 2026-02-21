import { goeyToast } from 'goey-toast'
import { useEffect, useRef } from 'react'

interface UseLookupToastProps {
  loading: boolean
  hasData: boolean
  open: boolean
  message?: string
}

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

  useEffect(() => {
    if (loading && hasData && open) {
      const id = goeyToast(message, { duration: 10000 })
      toastIdRef.current = id

      return () => {
        if (toastIdRef.current !== null) {
          goeyToast.dismiss(toastIdRef.current)
          toastIdRef.current = null
        }
      }
    }
  }, [loading, hasData, open, message])
}
