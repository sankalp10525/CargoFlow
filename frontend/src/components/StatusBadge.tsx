import type { OrderStatus, RouteStatus, ExceptionStatus } from "@/types";
import { clsx } from "clsx";

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; classes: string }
> = {
  CREATED: { label: "Created", classes: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  ASSIGNED: { label: "Assigned", classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  PICKED_UP: { label: "Picked Up", classes: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" },
  IN_TRANSIT: { label: "In Transit", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  DELIVERED: { label: "Delivered", classes: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  FAILED: { label: "Failed", classes: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  CANCELLED: { label: "Cancelled", classes: "bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-500" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? {
    label: status,
    classes: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={clsx("status-badge", cfg.classes)}>{cfg.label}</span>
  );
}

const ROUTE_STATUS_CONFIG: Record<RouteStatus, { label: string; classes: string }> = {
  PLANNED: { label: "Planned", classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  IN_PROGRESS: { label: "In Progress", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  COMPLETED: { label: "Completed", classes: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  CANCELLED: { label: "Cancelled", classes: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500" },
};

export function RouteStatusBadge({ status }: { status: RouteStatus }) {
  const cfg = ROUTE_STATUS_CONFIG[status] ?? { label: status, classes: "bg-gray-100 text-gray-700" };
  return <span className={clsx("status-badge", cfg.classes)}>{cfg.label}</span>;
}

const EXCEPTION_STATUS_CONFIG: Record<ExceptionStatus, { label: string; classes: string }> = {
  OPEN: { label: "Open", classes: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  ACKNOWLEDGED: { label: "Acknowledged", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  RESOLVED: { label: "Resolved", classes: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
};

export function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  const cfg = EXCEPTION_STATUS_CONFIG[status] ?? { label: status, classes: "bg-gray-100 text-gray-700" };
  return <span className={clsx("status-badge", cfg.classes)}>{cfg.label}</span>;
}
