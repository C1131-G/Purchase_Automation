import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
import { useEffect } from 'react'

import { GOEY_LOGIN_TOAST_DURATION } from '@/components/goey-toast.config'
import { authKeys, authQueries } from '@/features/auth/api/auth.queries'
import type { User } from '@/features/auth/api/auth.service'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuthStore } from '@/store/auth/auth.store'

const USER_CHECK_SKIP_MS = 15000
const USER_CHECK_ATTEMPT_SKIP_MS = 5 * 60 * 1000

/**
 * LoginRoute: Authenticated entryway with flex-centered layout and minimalist slate background.
 * Validates existing sessions on mount before showing credentials form.
 */
export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({
        to: '/purchase/orders',
        search: { page: 1, limit: 10 },
      })
    }

    try {
      const user = await context.queryClient.ensureQueryData(authQueries.user())
      useAuthStore.getState().login(user)
      throw redirect({
        to: '/purchase/orders',
        search: { page: 1, limit: 10 },
      })
    } catch {
      // No active session; keep login visible.
    }
  },
  component: LoginComponent,
})

function LoginComponent() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const SESSION_WARNING_TOAST_ID = 'auth-session-ended'
  const USER_CHECK_FAIL_AT_KEY = 'auth:me:check:last-fail-at'
  const USER_CHECK_ATTEMPTED_AT_KEY = 'auth:me:check:last-attempt-at'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reason = params.get('reason')
    if (reason !== 'session_ended') return

    goeyToast.warning('Session ended', {
      id: SESSION_WARNING_TOAST_ID,
      duration: GOEY_LOGIN_TOAST_DURATION,
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    let checkTimeoutId: number | null = null
    let idleCallbackId: number | null = null
    const params = new URLSearchParams(window.location.search)
    const reason = params.get('reason')
    const isSessionEndedReason = reason === 'session_ended'
    const isExplicitLogoutReason = reason === 'logged_out'
    const lastFailRaw = window.sessionStorage.getItem(USER_CHECK_FAIL_AT_KEY)
    const lastFailAt = lastFailRaw ? Number(lastFailRaw) : 0
    const lastAttemptRaw = window.sessionStorage.getItem(USER_CHECK_ATTEMPTED_AT_KEY)
    const lastAttemptAt = lastAttemptRaw ? Number(lastAttemptRaw) : 0
    const shouldSkipByRecentFailure =
      Number.isFinite(lastFailAt) && Date.now() - lastFailAt < USER_CHECK_SKIP_MS
    const shouldSkipByRecentAttempt =
      Number.isFinite(lastAttemptAt) && Date.now() - lastAttemptAt < USER_CHECK_ATTEMPT_SKIP_MS
    const cachedUser = queryClient.getQueryData<User>(authKeys.user())

    if (isSessionEndedReason || isExplicitLogoutReason || shouldSkipByRecentFailure) {
      return () => {
        isMounted = false
      }
    }

    if (cachedUser) {
      useAuthStore.getState().login(cachedUser)
      navigate({
        to: '/purchase/orders',
        search: {
          page: 1,
          limit: 10,
        },
        replace: true,
      })
      return () => {
        isMounted = false
      }
    }

    if (shouldSkipByRecentAttempt) {
      return () => {
        isMounted = false
      }
    }

    const probeSession = () => {
      window.sessionStorage.setItem(USER_CHECK_ATTEMPTED_AT_KEY, String(Date.now()))
      void queryClient
        .fetchQuery(authQueries.user())
        .then((user) => {
          if (!isMounted) return
          window.sessionStorage.removeItem(USER_CHECK_FAIL_AT_KEY)
          useAuthStore.getState().login(user)
          navigate({
            to: '/purchase/orders',
            search: {
              page: 1,
              limit: 10,
            },
            replace: true,
          })
        })
        .catch(() => {
          window.sessionStorage.setItem(USER_CHECK_FAIL_AT_KEY, String(Date.now()))
          // No active session; keep login visible.
        })
    }

    // Keep first paint uninterrupted and run session probe in idle time.
    if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(probeSession, { timeout: 1200 })
    } else {
      checkTimeoutId = window.setTimeout(probeSession, 300)
    }

    return () => {
      isMounted = false
      if (checkTimeoutId !== null) {
        window.clearTimeout(checkTimeoutId)
      }
      if (idleCallbackId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleCallbackId)
      }
    }
  }, [navigate, queryClient])

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-white">
      <div>
        <LoginForm />
      </div>
    </div>
  )
}
