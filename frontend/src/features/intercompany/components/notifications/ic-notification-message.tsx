import type { ReactNode } from "react";

import type { IcNotification } from "@/features/intercompany/schemas/intercompany-api.schema";
import {
  getIcNotificationPrimaryLink,
  parseIcNotificationDocLinks,
  type IcNotificationDocLink,
} from "@/features/intercompany/utils/ic-notification-navigation";
import { cn } from "@/shared/utils/cn";

export interface IcNotificationMessageProps {
  notification: IcNotification;
  className?: string;
  onNavigate?: (notification: IcNotification, link: IcNotificationDocLink) => void;
}

const linkButtonClassName =
  "inline cursor-pointer rounded px-0.5 font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 transition-colors hover:bg-violet-50 hover:text-violet-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300";

export function IcNotificationMessage({
  notification,
  className,
  onNavigate,
}: IcNotificationMessageProps) {
  const message = notification.message?.trim();
  const links = parseIcNotificationDocLinks(notification);
  const primaryLink = getIcNotificationPrimaryLink(notification);
  const canNavigate = Boolean(onNavigate && primaryLink);

  if (!message) {
    return <span className={className}>—</span>;
  }

  if (links.length === 0) {
    return (
      <button
        type="button"
        className={cn(
          "block w-full whitespace-pre-wrap break-words text-left text-zinc-700",
          canNavigate && "cursor-pointer hover:text-zinc-900",
          className,
        )}
        disabled={!canNavigate}
        onClick={() => {
          if (primaryLink && onNavigate) {
            onNavigate(notification, primaryLink);
          }
        }}
      >
        {message}
      </button>
    );
  }

  const segments: ReactNode[] = [];
  let cursor = 0;

  for (const link of links) {
    if (link.start > cursor) {
      segments.push(message.slice(cursor, link.start));
    }

    segments.push(
      <button
        key={`${link.start}-${link.label}`}
        type="button"
        className={linkButtonClassName}
        onClick={(event) => {
          event.stopPropagation();
          onNavigate?.(notification, link);
        }}
        title={`Open ${link.label}`}
      >
        {link.label}
      </button>,
    );
    cursor = link.end;
  }

  if (cursor < message.length) {
    segments.push(message.slice(cursor));
  }

  return (
    <span className={cn("block whitespace-pre-wrap break-words text-zinc-700", className)}>
      {segments}
    </span>
  );
}
