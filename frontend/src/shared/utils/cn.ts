import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** cn: Intelligent class-name merger (Tailwind-aware) using clsx and tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
