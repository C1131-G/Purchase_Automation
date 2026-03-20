/** Document Action Toast: Unified success/error notifications for backend actions. */
import { goeyToast } from 'goey-toast'

/**
 * Starts a "Creating…" info toast and returns a handle to resolve it.
 * Call `handle.success()` on mutation success, `handle.error()` on failure.
 *
 * @param documentType - Human-readable document name, e.g. "Purchase Order".
 * @param action - Mutation intent, either create or update.
 */
export function documentActionToast(documentType: string, action: 'create' | 'update' = 'create') {
  const verb = action === 'update' ? 'Updating' : 'Creating'
  const successVerb = action === 'update' ? 'updated' : 'created'
  const failureText = action === 'update' ? 'Update failed' : 'Create failed'

  const loadingId = goeyToast.info(`${verb} ${documentType}…`, {
    // Keep visible until we explicitly dismiss on success/error.
    duration: 24 * 60 * 60 * 1000,
  })

  return {
    success: (docNum?: string | number) => {
      goeyToast.dismiss(loadingId)
      const docSuffix = docNum ? ` ${docNum}` : ''
      goeyToast.success(`${documentType}${docSuffix} ${successVerb}`, {
        duration: 86400000, // 24 hours
      })
    },
    error: () => {
      goeyToast.dismiss(loadingId)
      goeyToast.error(failureText)
    },
  }
}
