import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2, ChevronRight, Eye, EyeOff } from 'lucide-react'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { authQueries } from '@/features/auth/api/auth.queries'
import { useLogin } from '@/features/auth/hooks/use-login'
import { type LoginFormData, loginSchema } from '@/schemas/auth.schema'
import { useAuthError } from '@/store/auth.store'

/**
 * LoginForm Component.
 *
 * Cleanly integrated with the standardized Design System.
 * - Inherits Sapphire highlights and Industrial typography.
 * - Centered viewport presence.
 */
export function LoginForm() {
  const [showPassword, setShowPassword] = React.useState(false)

  // --- Real Backend Hooks ---
  const authError = useAuthError()
  const { data: organizations, isLoading: isLoadingOrgs } = useQuery(authQueries.organization())
  const { mutate: loginMutation, isPending: isLoggingIn } = useLogin()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      organization: '',
      username: '',
      password: '',
    },
  })

  /** Submission handler */
  const onSubmit = (data: LoginFormData) => {
    loginMutation({
      username: data.username,
      password: data.password,
      companyDB: data.organization,
    })
  }

  return (
    <div className="w-full sm:w-[420px] mx-auto space-y-7 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase font-outfit">
          Portal Access
        </h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.25em]">
          Secure Gateway Entrance
        </p>
      </div>

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* --- Organization --- */}
        <Controller
          name="organization"
          control={control}
          render={({ field }) => (
            <Field.Root error={errors.organization?.message || ''}>
              <Field.Label>Access Gateway</Field.Label>
              <Select.Root
                defaultValue={field.value}
                onValueChange={field.onChange}
                disabled={isLoadingOrgs || isLoggingIn}
              >
                <Select.Trigger>
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <Building2 className="size-4 text-zinc-400 shrink-0" />
                    <div className="truncate text-left">
                      <Select.Value placeholder="Select Database..." />
                    </div>
                  </div>
                  <Select.Icon>
                    <ChevronRight size={18} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner>
                    <Select.Popup>
                      <Select.List>
                        {organizations?.map((org) => (
                          <Select.Item key={org.dbName} value={org.dbName} label={org.companyName}>
                            <div className="flex flex-col gap-0.5 py-1">
                              <span className="font-bold text-[13px] text-zinc-900">
                                {org.companyName}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                                db: {org.dbName}
                              </span>
                            </div>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
              <Field.Error />
            </Field.Root>
          )}
        />

        {/* --- Username --- */}
        <Field.Root error={errors.username?.message || ''}>
          <Field.Label>Username</Field.Label>
          <Input
            {...register('username')}
            placeholder="Username"
            autoComplete="username"
            disabled={isLoggingIn}
          />
          <Field.Error />
        </Field.Root>

        {/* --- Password --- */}
        <Field.Root error={errors.password?.message || ''}>
          <Field.Label>Password</Field.Label>
          <div className="relative w-full">
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoggingIn}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center text-zinc-300 hover:text-zinc-950 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer border-none bg-transparent"
              disabled={isLoggingIn}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Field.Error />
        </Field.Root>

        {/* --- Error Display --- */}
        {authError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-800 border border-red-100 animate-in zoom-in-95">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-[11px] font-bold uppercase tracking-wide leading-relaxed">
              {authError}
            </p>
          </div>
        )}

        {/* --- Submit --- */}
        <div className="pt-2">
          <Button
            type="submit"
            isLoading={isLoggingIn}
            loadingText="Authenticating..."
            disabled={isLoadingOrgs}
            className="w-full"
          >
            Sign In
          </Button>
        </div>
      </Form>
    </div>
  )
}
