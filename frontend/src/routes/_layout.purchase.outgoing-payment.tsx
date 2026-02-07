import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/purchase/outgoing-payment')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase font-outfit">
        Outgoing Payment
      </h1>
      <div className="p-20 rounded-[2rem] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
        <p className="font-bold underline uppercase tracking-widest text-xs">Module Ready</p>
        <p className="text-sm mt-2 font-medium">
          Outgoing Payment module will be implemented here.
        </p>
      </div>
    </div>
  )
}
