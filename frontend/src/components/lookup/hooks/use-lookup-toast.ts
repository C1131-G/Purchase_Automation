import { goeyToast } from 'goey-toast'
import { useEffect, useRef } from 'react'

interface UseLookupToastProps {
  loading: boolean
  hasData: boolean
  open: boolean
}

/**
 * Custom hook to show a "Searching…" toast when a lookup is fetching in the background
 * but already has some data visible to the user.
 */
export function useLookupToast({ loading, hasData, open }: UseLookupToastProps) {
  const toastIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    if (loading && hasData && open) {
      const id = goeyToast('Searching…', { duration: 10000 })
      toastIdRef.current = id

      return () => {
        if (toastIdRef.current !== null) {
          goeyToast.dismiss(toastIdRef.current)
          toastIdRef.current = null
        }
      }
    }
  }, [loading, hasData, open])
}
