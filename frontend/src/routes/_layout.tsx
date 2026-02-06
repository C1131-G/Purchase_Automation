import { createFileRoute } from '@tanstack/react-router'

import { ShellLayout } from '@/features/layout/components/ShellLayout'

/**
 * Shell Layout Route.
 * This route wraps all ERP module pages with the persistent Sidebar & Header.
 */
export const Route = createFileRoute('/_layout')({
  component: ShellLayout,
})
