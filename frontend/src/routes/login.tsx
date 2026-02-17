import { createFileRoute, redirect } from '@tanstack/react-router'

import { authQueries } from '@/features/auth/api/auth.queries'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuthStore } from '@/store/auth/auth.store'

// Login Route: Authenticated entryway with flex-centered layout and minimalist slate background.
export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/' })
    }

    try {
      const user = await context.queryClient.ensureQueryData(authQueries.user())
      useAuthStore.getState().login(user)
      throw redirect({ to: '/' })
    } catch {
      // no active session; stay on login
    }
  },
  component: LoginComponent,
})

function LoginComponent() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-white">
      <div className="animate-in fade-in zoom-in-95 duration-700">
        <LoginForm />
      </div>
    </div>
  )
}
