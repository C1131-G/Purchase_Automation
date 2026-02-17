import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-white px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Compass className="size-7" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-zinc-900">Page not found</h1>
        <p className="mt-3 text-sm text-zinc-500">
          This link doesn’t exist or was moved. Use the button below to return.
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => navigate({ to: '/' })}
          >
            <ArrowLeft className="size-4" />
            Back to Page
          </Button>
        </div>
      </div>
    </div>
  )
}
