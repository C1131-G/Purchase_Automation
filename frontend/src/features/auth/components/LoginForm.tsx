import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { goeyToast } from "goey-toast";
import { Building2, ChevronRight, Eye, EyeOff } from "lucide-react";
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

// LoginForm: Authenticated entryway utilizing standardized Sapphire and Industrial design patterns.
export function LoginForm() {
  const [showPassword, setShowPassword] = React.useState(false);
  const ORG_ERROR_TOAST_ID = "auth-org-load-error";

  // --- Real Backend Hooks ---
  const authError = useAuthError();
  const {
    data: organizations,
    isLoading: isLoadingOrgs,
    isError: isOrganizationsError,
    isFetching: isOrganizationsFetching,
  } = useQuery(authQueries.organization());
  const { mutate: loginMutation, isPending: isLoggingIn } = useLogin();

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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      organization: "",
      password: "",
      username: "",
    },
    resolver: zodResolver(loginSchema),
  });

  // onSubmit: Manages login form submission and state synchronization.
  const onSubmit = (data: LoginFormData) => {
    loginMutation({
      companyDB: data.organization,
      password: data.password,
      username: data.username,
    });
  };

  return (
    <div className="w-full sm:w-105 mx-auto space-y-7">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase font-outfit">
          Access Gateway
        </h1>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.25em]">
          Secure Gateway Entrance
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
                defaultValue={field.value}
                onValueChange={field.onChange}
                disabled={isLoadingOrgs || isLoggingIn}
                autoComplete="off"
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
                          <div className="px-3 py-2 text-xs text-zinc-500">
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
          <Input
            {...register("username")}
            placeholder="Username"
            autoComplete="off"
            disabled={isLoggingIn}
          />
          <Field.Error />
        </Field>

        {/* --- Password --- */}
        <Field error={errors.password?.message || ""}>
          <Field.Label>Password</Field.Label>
          <div className="relative w-full">
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
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
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold tracking-normal text-zinc-900 shadow-sm transition-all hover:bg-zinc-50 hover:text-blue-600 focus:outline-none focus:ring-0 active:scale-[0.98]"
          >
            Sign In
          </Button>
        </div>
      </Form>
    </div>
  );
}
