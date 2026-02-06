import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuthStore } from '@/store/auth.store'

/**
 * Login Route Definition.
 *
 * Renders a full-screen, centered authentication page.
 * - Vertical and horizontal centering via Flexbox.
 * - Minimalist slate background for focus.
 */
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
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-8 bg-white">
      <div className="animate-in fade-in zoom-in-95 duration-700">
        <LoginForm />
      </div>
    </div>
  )
}
