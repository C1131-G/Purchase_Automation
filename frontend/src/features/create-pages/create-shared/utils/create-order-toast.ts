import { goeyToast } from 'goey-toast'

/**
 * Starts a "Creating…" info toast and returns a handle to resolve it.
 * Call `handle.success()` on mutation success, `handle.error()` on failure.
 *
 * @param documentType - Human-readable document name, e.g. "Purchase Order".
 */
export function createOrderToast(documentType: string) {
  const loadingId = goeyToast.info(`Creating ${documentType}…`, {
    // Keep visible until we explicitly dismiss on success/error.
    duration: 24 * 60 * 60 * 1000,
  })

  return {
    success: () => {
      goeyToast.dismiss(loadingId)
      goeyToast.success(`${documentType} created`)
    },
    error: () => {
      goeyToast.dismiss(loadingId)
      goeyToast.error('Create failed')
    },
  }
}
