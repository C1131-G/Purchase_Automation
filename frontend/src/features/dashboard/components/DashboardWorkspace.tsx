import React from "react";

interface DashboardWorkspaceProps {
  children: React.ReactNode;
}

export function DashboardWorkspace({ children }: DashboardWorkspaceProps) {
  return (
    <div className="flex-1 w-full bg-zinc-50/50 overflow-y-auto px-6 py-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">{children}</div>
    </div>
  );
}
