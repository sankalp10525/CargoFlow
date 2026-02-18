import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { trackingApi } from "@/api/endpoints";
import type { TrackingData, OrderStatus } from "@/types";
import Spinner from "@/components/Spinner";
import { Package, CheckCircle2, XCircle, Clock, Truck } from "lucide-react";

const STATUS_STEPS: OrderStatus[] = [
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
];

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
  const currentIdx = STATUS_STEPS.indexOf(current);

  if (isFailed) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
        <XCircle size={20} />
        <span className="font-semibold">{current}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {STATUS_STEPS.map((step, i) => {
        const Icon = STATUS_ICONS[step];
        const done = i <= currentIdx;
        return (
          <div key={step} className="flex flex-1 flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                done ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"
              }`}
            >
              <Icon size={16} />
            </div>
            <p className={`mt-1 text-center text-xs ${done ? "text-brand-700 font-medium" : "text-gray-400"}`}>
              {step.replace("_", " ")}
            </p>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`absolute mt-4 h-0.5 w-full ${done ? "bg-brand-600" : "bg-gray-200"}`} />
            )}
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-700 px-4 py-5 text-white">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Package size={22} />
            CargoFlow
          </div>
          <p className="text-sm text-brand-200 mt-0.5">Shipment Tracking</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg p-4">
        {isLoading && (
          <div className="flex justify-center p-16">
            <Spinner size={32} />
          </div>
        )}

        {isError && (
          <div className="card mt-4 text-center">
            <XCircle size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-700">Tracking not found</p>
            <p className="text-sm text-gray-400">Check the link and try again.</p>
          </div>
        )}

        {data && (
          <>
            <div className="card mt-4">
              <p className="text-xs text-gray-400">Reference</p>
              <p className="font-mono font-bold text-gray-900">{data.reference_code}</p>
              <p className="mt-1 text-sm text-gray-500">{data.customer_name}</p>
            </div>

            <div className="card mt-3 overflow-x-auto">
              <h3 className="mb-4 font-semibold text-gray-800">Status</h3>
              <StatusTimeline current={data.status} />
            </div>

            {data.stops.length > 0 && (
              <div className="card mt-3">
                <h3 className="mb-3 font-semibold text-gray-800">Stops</h3>
                <ol className="space-y-2">
                  {data.stops.map((stop, i) => (
                    <li key={stop.id} className="flex gap-3 items-start">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          <span className="mr-1 text-xs text-gray-400">[{stop.type}]</span>
                          {stop.address_line1}, {stop.city}
                        </p>
                        {stop.scheduled_eta && (
                          <p className="text-xs text-gray-400">
                            ETA: {new Date(stop.scheduled_eta).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`ml-auto text-xs font-semibold ${
                          stop.status === "COMPLETED"
                            ? "text-green-600"
                            : stop.status === "SKIPPED"
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        {stop.status}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.pod_summary && (
              <div className="card mt-3 border-green-100 bg-green-50">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">Delivered</span>
                </div>
                <p className="mt-1 text-sm text-green-700">
                  Received by {data.pod_summary.receiver_name} on{" "}
                  {new Date(data.pod_summary.delivered_at).toLocaleString()}
                </p>
              </div>
            )}

            {data.last_update && (
              <p className="mt-3 text-center text-xs text-gray-400">
                Last updated: {new Date(data.last_update).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
