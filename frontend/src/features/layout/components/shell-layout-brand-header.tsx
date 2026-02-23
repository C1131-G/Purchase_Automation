import { Building2 } from 'lucide-react'

import { SidebarHeader } from '@/components/sidebar'

export function ShellLayoutBrandHeader() {
  return (
    <SidebarHeader className="p-5 border-zinc-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] cursor-pointer">
            <Building2 className="size-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden animate-in fade-in duration-1000">
            <span className="text-sm font-black uppercase tracking-tight text-zinc-950 leading-tight">
              Vendor Portal
            </span>
            <span className="text-[9px] text-blue-600 font-bold uppercase tracking-[0.2em] leading-none mt-0.5">
              Industrial Cloud
            </span>
          </div>
        </div>
      </div>
    </SidebarHeader>
  )
}
