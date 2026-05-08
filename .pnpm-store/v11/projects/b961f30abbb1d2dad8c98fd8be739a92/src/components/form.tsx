import type { FormProps } from "@/components/types/form.types";
import { cn } from "@/shared/utils/cn";

/** Form: Flex container wrapper for transactional input groups. */
export function Form({ className, ...props }: FormProps) {
  return <form className={cn("flex flex-col gap-4", className)} {...props} />;
}
