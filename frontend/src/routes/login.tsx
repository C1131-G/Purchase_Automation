import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { goeyToast } from 'goey-toast'
import { useEffect } from 'react'

import { GOEY_LOGIN_TOAST_DURATION } from '@/components/goey-toast.config'
import { authQueries } from '@/features/auth/api/auth.queries'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuthStore } from '@/store/auth/auth.store'

// Login Route: Authenticated entryway with flex-centered layout and minimalist slate background.
export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginComponent,
})

function LoginComponent() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const SESSION_WARNING_TOAST_ID = 'auth-session-ended'
  const USER_CHECK_FAIL_AT_KEY = 'auth:me:check:last-fail-at'
  const USER_CHECK_SKIP_MS = 15000

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
    const params = new URLSearchParams(window.location.search)
    const reason = params.get('reason')
    const isSessionEndedReason = reason === 'session_ended'
    const isExplicitLogoutReason = reason === 'logged_out'
    const lastFailRaw = window.sessionStorage.getItem(USER_CHECK_FAIL_AT_KEY)
    const lastFailAt = lastFailRaw ? Number(lastFailRaw) : 0
    const shouldSkipByRecentFailure =
      Number.isFinite(lastFailAt) && Date.now() - lastFailAt < USER_CHECK_SKIP_MS

    if (isSessionEndedReason || isExplicitLogoutReason || shouldSkipByRecentFailure) {
      return () => {
        isMounted = false
      }
    }

    // Show login UI first, then probe /auth/me on the next tick.
    checkTimeoutId = window.setTimeout(() => {
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
    }, 0)

    return () => {
      isMounted = false
      if (checkTimeoutId !== null) {
        window.clearTimeout(checkTimeoutId)
      }
    }
  }, [navigate, queryClient])

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-white">
      <div className="animate-in fade-in zoom-in-95 duration-200">
        <LoginForm />
      </div>
    </div>
  )
}
