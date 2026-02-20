import { goeyToast } from 'goey-toast'
import { useEffect, useRef } from 'react'

/** The type of user-triggered action that caused a refetch. */
export type TableFetchAction = 'sorting' | 'filtering' | 'paginating' | 'fetching'

interface UseTableToastProps {
  isFetching: boolean
  hasData: boolean
  /** Which action triggered the current fetch – drives the toast message. */
  action?: TableFetchAction
}

const ACTION_MESSAGES: Record<TableFetchAction, string> = {
  sorting: 'Sorting…',
  filtering: 'Filtering…',
  paginating: 'Loading page…',
  fetching: 'Loading data…',
}

/**
 * Action-specific background loading toast.
 *
 * Shows a non-blocking `goeyToast` while React Query is actively fetching
 * in the background (stale data already visible). The message reflects the
 * action that triggered the fetch. Dismissed automatically when done.
 */
export function useTableToast({ isFetching, hasData, action = 'fetching' }: UseTableToastProps) {
  const toastIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    if (isFetching && hasData) {
      const message = ACTION_MESSAGES[action]
      const id = goeyToast(message, { duration: 10000 })
      toastIdRef.current = id

      return () => {
        if (toastIdRef.current !== null) {
          goeyToast.dismiss(toastIdRef.current)
          toastIdRef.current = null
        }
      }
    }
  }, [isFetching, hasData, action])
}
