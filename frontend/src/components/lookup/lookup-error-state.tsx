import { AlertTriangle } from 'lucide-react'

type LookupErrorStateProps = {
  colSpan: number
  message: string
  title?: string
}

export function LookupErrorState({
  colSpan,
  message,
  title = 'Lookup unavailable',
}: LookupErrorStateProps) {
  return (
    <tr>
      <td className="px-3 py-3" colSpan={colSpan}>
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-center">
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <AlertTriangle className="size-4" />
          </div>
          <p className="text-xs font-semibold text-zinc-900">{title}</p>
          <p className="text-[11px] text-zinc-500">{message}</p>
        </div>
      </td>
    </tr>
  )
}
