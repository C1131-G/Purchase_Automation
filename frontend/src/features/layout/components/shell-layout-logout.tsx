import { Button } from '@/components/button'
import { SidebarFooter, SidebarMenu, SidebarMenuItem } from '@/components/sidebar'

type ShellLayoutLogoutProps = {
  logoutBusy: boolean
  onLogout: () => void
}

export function ShellLayoutLogout({ logoutBusy, onLogout }: ShellLayoutLogoutProps) {
  return (
    <SidebarFooter className="p-4 border-t border-zinc-50">
      <SidebarMenu>
        <SidebarMenuItem>
          <Button
            type="button"
            onClick={onLogout}
            isLoading={logoutBusy}
            loadingText="Logging out..."
            variant="danger"
            className="h-11 w-full rounded-xl border border-red-200 bg-red-50 text-red-700 normal-case tracking-normal shadow-[0_4px_10px_rgba(248,113,113,0.18)] hover:bg-red-100 focus:ring-red-300/40"
          >
            Log out
          </Button>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
