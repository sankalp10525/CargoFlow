import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { trackingApi } from "@/api/endpoints";
import type { TrackingData, OrderStatus } from "@/types";
import Spinner from "@/components/Spinner";
import { Package, CheckCircle2, XCircle, Clock, Truck, MapPin, User } from "lucide-react";

const STATUS_STEPS: OrderStatus[] = ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];

const STATUS_LABELS: Record<string, string> = {
  CREATED: "Order Placed",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  CREATED: Clock,
  ASSIGNED: Package,
  PICKED_UP: Package,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
  FAILED: XCircle,
  CANCELLED: XCircle,
};

function StatusTimeline({ current }: { current: OrderStatus }) {
  const isFailed = current === "FAILED" || current === "CANCELLED";
  const currentIdx = STATUS_STEPS.indexOf(current as OrderStatus);

  if (isFailed) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-red-50 p-4 text-red-700">
        <XCircle size={20} />
        <span className="font-semibold">{current}</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-start justify-between gap-1">
      {/* Connecting line behind icons */}
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 z-0" />
      <div
        className="absolute top-4 left-0 h-0.5 bg-brand-500 z-0 transition-all duration-700"
        style={{
          width: currentIdx >= 0 ? `${(currentIdx / (STATUS_STEPS.length - 1)) * 100}%` : "0%",
        }}
      />
      {STATUS_STEPS.map((step, i) => {
        const Icon = STATUS_ICONS[step];
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="relative z-10 flex flex-1 flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                done
                  ? isCurrent
                    ? "border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-200 ring-4 ring-brand-100"
                    : "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-200 bg-white text-gray-300"
              }`}
            >
              <Icon size={15} />
            </div>
            <p
              className={`mt-2 text-center text-xs leading-tight max-w-[56px] ${
                done ? "text-brand-700 font-semibold" : "text-gray-400"
              }`}
            >
              {STATUS_LABELS[step] ?? step}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackingPage() {
  const { trackingToken } = useParams<{ trackingToken: string }>();

  const { data, isLoading, isError } = useQuery<TrackingData>({
    queryKey: ["tracking", trackingToken],
    queryFn: () => trackingApi.get(trackingToken!).then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!trackingToken,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-800 dark:from-brand-800 dark:to-brand-900 px-4 py-5 text-white shadow-md">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 dark:bg-white/10">
              <Package size={18} className="text-white" />
            </div>
            CargoFlow
          </div>
          <p className="text-sm text-brand-200 mt-0.5 ml-11">Shipment Tracking</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg p-4">
        {isLoading && (
          <div className="flex justify-center p-16">
            <Spinner size={32} />
          </div>
        )}

        {isError && (
          <div className="card mt-4 text-center py-10">
            <XCircle size={36} className="mx-auto mb-3 text-gray-200 dark:text-gray-600" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">Tracking not found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check the link and try again.</p>
          </div>
        )}

        {data && (
          <div className="space-y-3 mt-4">
            {/* Order info */}
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900">
                  <Package size={18} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="font-mono font-bold text-gray-900 dark:text-gray-100">{data.reference_code}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{data.customer_name}</p>
                </div>
              </div>
            </div>

            {/* Status timeline */}
            <div className="card">
              <h3 className="mb-5 font-semibold text-gray-800 dark:text-gray-100">Shipment Status</h3>
              <StatusTimeline current={data.status} />
            </div>

            {/* Stops */}
            {data.stops.length > 0 && (
              <div className="card">
                <h3 className="mb-3 font-semibold text-gray-800 dark:text-gray-100">Delivery Stops</h3>
                <ol className="space-y-3">
                  {data.stops.map((stop, i) => (
                    <li key={stop.id} className="flex gap-3 items-start">
                      <div className="relative">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                          {i + 1}
                        </span>
                        {i < data.stops.length - 1 && (
                          <div className="absolute left-1/2 top-6 h-full w-px -translate-x-1/2 bg-gray-100 dark:bg-gray-700" />
                        )}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                                  stop.type === "PICKUP"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {stop.type}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                              <MapPin size={12} className="text-gray-400 dark:text-gray-500 shrink-0" />
                              {stop.address_line}, {stop.city}
                            </p>
                            {stop.scheduled_eta && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                ETA: {new Date(stop.scheduled_eta).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              stop.status === "COMPLETED"
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                : stop.status === "SKIPPED"
                                ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {stop.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* POD */}
            {data.pod_summary && (
              <div className="card border-green-100 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">Delivered Successfully</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <User size={13} className="shrink-0" />
                  Received by{" "}
                  <span className="font-medium">{data.pod_summary.receiver_name}</span>
                </div>
                <p className="mt-1 text-xs text-green-600 dark:text-green-500">
                  {new Date(data.pod_summary.delivered_at).toLocaleString("en-IN", {
                    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            )}

            {data.last_update && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Last updated: {new Date(data.last_update).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
