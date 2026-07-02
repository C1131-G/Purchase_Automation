import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { Building2, ChevronRight, Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import React from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/button";
import { Field } from "@/components/field/field";
import { Form } from "@/components/form";
import { GOEY_LOGIN_TOAST_DURATION } from "@/components/goey-toast.config";
import { Input } from "@/components/input/input";
import { Select } from "@/components/select/select";
import { authQueries } from "@/features/auth/api/auth.queries";
import { useLogin } from "@/features/auth/hooks/use-login";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import type { LoginFormData } from "@/features/auth/schemas/auth.schema";
import { useAuthError } from "@/store/auth/auth.store";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// LoginForm: Authenticated entryway utilizing standardized Sapphire and Industrial design patterns.
export function LoginForm() {
  const [showPassword, setShowPassword] = React.useState(false);
  const ORG_ERROR_TOAST_ID = "auth-org-load-error";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      organization: "",
      password: "",
      username: "",
    },
    resolver: zodResolver(loginSchema),
  });

  const watchedUsername = watch("username");
  const debouncedUsername = useDebounce(watchedUsername, 500);

  // --- Real Backend Hooks ---
  const authError = useAuthError();
  const {
    data: organizations,
    isLoading: isLoadingOrgs,
    isError: isOrganizationsError,
    isFetching: isOrganizationsFetching,
  } = useQuery(authQueries.organization(debouncedUsername));
  const { mutate: loginMutation, isPending: isLoggingIn } = useLogin();

  const orgLabelMap = React.useMemo(() => {
    if (!organizations) return {};
    return organizations.reduce(
      (acc, org) => {
        acc[org.dbName] = org.companyName;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [organizations]);

  React.useEffect(() => {
    if (isLoadingOrgs || isOrganizationsFetching) {
      return;
    }

    if (!isOrganizationsError) {
      goeyToast.dismiss(ORG_ERROR_TOAST_ID);
      return;
    }

    goeyToast.error("Unable to load databases", {
      duration: GOEY_LOGIN_TOAST_DURATION,
      id: ORG_ERROR_TOAST_ID,
    });
  }, [isLoadingOrgs, isOrganizationsFetching, isOrganizationsError]);

  // Auto-select DB if exactly 1 DB is returned
  React.useEffect(() => {
    if (organizations && organizations.length === 1 && organizations[0]) {
      setValue("organization", organizations[0].dbName, { shouldValidate: true });
    }
  }, [organizations, setValue]);

  // onSubmit: Manages login form submission and state synchronization.
  const onSubmit = (data: LoginFormData) => {
    loginMutation({
      companyDB: data.organization,
      password: data.password,
      username: data.username,
    });
  };

  return (
    <div className="w-full max-w-100 mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-sans">
          Access Gateway
        </h1>
        <p className="text-[0.9375rem] text-zinc-500 font-medium">
          Enter your credentials to access your secure portal.
        </p>
      </div>

      {/* Anti-autofill decoy fields - hidden from user, confuse browser */}
      <input
        type="text"
        name="autofill_decoy_1"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -z-10 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="password"
        name="autofill_decoy_2"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -z-10 opacity-0 pointer-events-none"
        aria-hidden="true"
      />

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* --- Organization --- */}
        <Controller
          name="organization"
          control={control}
          render={({ field }) => (
            <Field error={errors.organization?.message || ""}>
              <Field.Label>Company DB</Field.Label>
              <Select
                id="organization"
                name="organization"
                value={field.value}
                onValueChange={field.onChange}
                disabled={
                  !organizations || organizations.length === 0 || isLoadingOrgs || isLoggingIn
                }
                autoComplete="off"
              >
                <Select.Trigger className="border-zinc-200 bg-white hover:bg-white hover:border-zinc-300 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white">
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <Building2 className="size-4 text-zinc-400 shrink-0" />
                    <div className="truncate text-left">
                      <Select.Value placeholder="Select Database..." labelMap={orgLabelMap} />
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
                        {organizations && organizations.length > 0 ? (
                          organizations.map((org) => (
                            <Select.Item
                              key={org.dbName}
                              value={org.dbName}
                              label={org.companyName}
                            >
                              <div className="flex flex-col gap-0.5 py-1">
                                <span className="font-bold text-[13px] text-zinc-900">
                                  {org.companyName}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                                  db: {org.dbName}
                                </span>
                              </div>
                            </Select.Item>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-zinc-500 font-medium">
                            {isLoadingOrgs || isOrganizationsFetching
                              ? "Loading databases..."
                              : "No databases available."}
                          </div>
                        )}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select>
              <Field.Error />
            </Field>
          )}
        />

        {/* --- Username --- */}
        <Field error={errors.username?.message || ""}>
          <Field.Label>Username</Field.Label>
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              {...register("username")}
              placeholder="Enter your username"
              autoComplete="off"
              disabled={isLoggingIn}
              className="pl-11 border border-zinc-200 bg-white shadow-sm outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white disabled:pointer-events-none disabled:opacity-60"
            />
          </div>
          <Field.Error />
        </Field>

        {/* --- Password --- */}
        <Field error={errors.password?.message || ""}>
          <Field.Label>Password</Field.Label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="new-password"
              disabled={isLoggingIn}
              className="pl-11 pr-12 border border-zinc-200 bg-white shadow-sm outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white disabled:pointer-events-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors hover:cursor-pointer border-none bg-transparent"
              disabled={isLoggingIn}
            >
              {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </div>
          <Field.Error />
        </Field>

        {/* --- Error + Submit --- */}
        <div className="space-y-2 pt-1">
          {authError ? (
            <p className="text-red-600 text-[11px] font-semibold text-center leading-tight">
              {authError}
            </p>
          ) : null}
          <Button
            type="submit"
            isLoading={isLoggingIn}
            loadingText="Authenticating..."
            disabled={isLoadingOrgs}
            className="h-11 w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-semibold tracking-normal text-white shadow-xl shadow-zinc-950/10 transition-all hover:bg-zinc-800 hover:shadow-zinc-950/20 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 active:scale-[0.98] border-none"
          >
            {!isLoggingIn && <LogIn className="h-4 w-4" />}
            Sign In
          </Button>
        </div>
      </Form>
    </div>
  );
}
