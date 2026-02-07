import { createFileRoute } from '@tanstack/react-router'

import { ShellLayout } from '@/features/layout/components/ShellLayout'

/**
 * Shell: The persistent ERP frame.
 * 
 * ARCHITECTURE: Wraps all module routes in `ShellLayout` (Sidebar + Header).
 * NAVIGATION: Ensures layout-specific UI remains stable during cross-module navigation.
 */
export const Route = createFileRoute('/_layout')({
  component: ShellLayout,
})
