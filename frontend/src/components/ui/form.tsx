import React from 'react'

import { cn } from '@/utils/cn'

import type { FormProps } from './types/form.types'

export function Form({ className, ...props }: FormProps) {
  return <form className={cn('flex flex-col gap-4', className)} {...props} />
}
