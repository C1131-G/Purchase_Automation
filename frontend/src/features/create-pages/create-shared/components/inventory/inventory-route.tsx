import { useDocumentTitle } from "@/hooks/use-document-title";
import type { ComponentType } from "react";

interface InventoryRouteComponentProps {
  title: string;
  component: ComponentType;
}

export function InventoryRouteComponent({
  title,
  component: Component,
}: InventoryRouteComponentProps) {
  useDocumentTitle(title);
  return <Component />;
}
