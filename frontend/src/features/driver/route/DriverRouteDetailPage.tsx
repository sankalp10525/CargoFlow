import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { driverApi } from "@/api/endpoints";
import type { Order, Route } from "@/types";
import { OrderStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { useState } from "react";
import { CheckCircle2, XCircle, MapPin, Package, Play, Camera } from "lucide-react";

// Valid transitions for the driver app
const DRIVER_TRANSITIONS: Record<string, { label: string; status: string; danger?: boolean }[]> = {
  ASSIGNED: [{ label: "Mark Picked Up", status: "PICKED_UP" }],
  PICKED_UP: [{ label: "Mark In Transit", status: "IN_TRANSIT" }],
  IN_TRANSIT: [
    { label: "Mark Delivered (POD)", status: "DELIVERED" },
    { label: "Mark Failed", status: "FAILED", danger: true },
  ],
};

export default function DriverRouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activePOD, setActivePOD] = useState<Order | null>(null);
  const [podName, setPodName] = useState("");
  const [podNotes, setPodNotes] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);

  const { data: route, isLoading, isError } = useQuery<Route>({
    queryKey: ["driver-route", id],
    queryFn: () => driverApi.route(id!).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const startRoute = useMutation({
    mutationFn: () => driverApi.startRoute(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-route", id] });
      qc.invalidateQueries({ queryKey: ["driver-today-route"] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setStatusError(err.response?.data?.detail ?? "Failed to start route.");
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, toStatus }: { orderId: string; toStatus: string }) =>
      driverApi.updateStatus(orderId, { to_status: toStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-route", id] });
      qc.invalidateQueries({ queryKey: ["driver-today-route"] });
      setStatusError(null);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setStatusError(err.response?.data?.detail ?? "Failed to update status.");
    },
  });

  const submitPOD = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: FormData }) =>
      driverApi.submitPOD(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-route", id] });
      qc.invalidateQueries({ queryKey: ["driver-today-route"] });
      setActivePOD(null);
      setPodName("");
      setPodNotes("");
      setStatusError(null);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setStatusError(err.response?.data?.detail ?? "Failed to submit POD.");
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError || !route) return <div className="p-4"><ErrorMessage /></div>;

  const completedOrders = route.orders?.filter(
    (o) => o.status === "DELIVERED" || o.status === "FAILED"
  ).length ?? 0;
  const totalOrders = route.orders?.length ?? 0;
  const progress = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  return (
    <div className="p-4 pb-20 animate-fade-in">
      {/* Route header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Route — {route.route_date}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {route.vehicle?.plate_number} · {route.vehicle?.type}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              route.status === "IN_PROGRESS"
                ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                : route.status === "COMPLETED"
                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
            }`}
          >
            {route.status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{completedOrders}/{totalOrders} orders done</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 dark:bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {route.status === "PLANNED" && (
          <button
            onClick={() => startRoute.mutate()}
            disabled={startRoute.isPending}
            className="btn-primary w-full justify-center mt-1"
          >
            <Play size={16} />
            {startRoute.isPending ? "Starting…" : "Start Route"}
          </button>
        )}
        {route.status === "COMPLETED" && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3 mt-1">
            <CheckCircle2 size={18} />
            <span className="font-semibold text-sm">Route Completed!</span>
          </div>
        )}
      </div>

      {statusError && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700 animate-fade-in">
          {statusError}
        </div>
      )}

      {/* Orders list */}
      <h3 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        Orders ({totalOrders})
      </h3>
      <div className="space-y-3">
        {route.orders?.map((order) => {
          const transitions = DRIVER_TRANSITIONS[order.status] ?? [];
          const isTerminal = order.status === "DELIVERED" || order.status === "FAILED" || order.status === "CANCELLED";
          return (
            <div
              key={order.id}
              className={`card transition-all duration-200 ${isTerminal ? "opacity-70" : "hover:shadow-md"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900">
                    <Package size={14} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{order.reference_code}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer_name}</p>
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {/* Stops */}
              <div className="mb-3 space-y-1.5">
                {order.stops?.map((stop) => (
                  <div key={stop.id} className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin
                      size={12}
                      className={`mt-0.5 shrink-0 ${stop.type === "PICKUP" ? "text-blue-500 dark:text-blue-400" : "text-green-500 dark:text-green-400"}`}
                    />
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                      stop.type === "PICKUP" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                    }`}>
                      {stop.type}
                    </span>
                    <span>{stop.address_line}, {stop.city}</span>
                    {stop.status === "COMPLETED" && (
                      <CheckCircle2 size={12} className="text-green-500 ml-auto shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* POD info */}
              {order.pod && (
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-700">
                  <CheckCircle2 size={13} />
                  <span>
                    Delivered to <strong>{order.pod.receiver_name}</strong> at{" "}
                    {new Date(order.pod.delivered_at).toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Action buttons — only show when route is in progress */}
              {route.status === "IN_PROGRESS" && !isTerminal && transitions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 mt-2">
                  {transitions.map((t) => (
                    <button
                      key={t.status}
                      onClick={() => {
                        if (t.status === "DELIVERED") {
                          setActivePOD(order);
                          setStatusError(null);
                        } else {
                          updateStatus.mutate({ orderId: order.id, toStatus: t.status });
                        }
                      }}
                      disabled={updateStatus.isPending && !t.danger}
                      className={`flex items-center gap-1.5 text-xs ${t.danger ? "btn-danger" : "btn-primary"}`}
                    >
                      {t.status === "DELIVERED" ? (
                        <Camera size={13} />
                      ) : t.status === "FAILED" ? (
                        <XCircle size={13} />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* POD bottom sheet modal */}
      {activePOD && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in">
          <div className="card w-full max-w-lg rounded-b-none rounded-t-2xl shadow-2xl animate-slide-up pb-8">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">Proof of Delivery</h3>
              <button
                onClick={() => { setActivePOD(null); setStatusError(null); }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Order: <span className="font-mono font-semibold text-brand-600">{activePOD.reference_code}</span>
              {" "}&mdash; {activePOD.customer_name}
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Receiver Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="Name of person who received the package"
                  value={podName}
                  onChange={(e) => setPodName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
                <input
                  className="input-field"
                  placeholder="Left at door, gave to neighbour, etc."
                  value={podNotes}
                  onChange={(e) => setPodNotes(e.target.value)}
                />
              </div>

              {statusError && (
                <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{statusError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  disabled={!podName.trim() || submitPOD.isPending}
                  className="btn-primary flex-1 justify-center"
                  onClick={() => {
                    const fd = new FormData();
                    fd.append("receiver_name", podName.trim());
                    if (podNotes.trim()) fd.append("notes", podNotes.trim());
                    submitPOD.mutate({ orderId: activePOD.id, data: fd });
                  }}
                >
                  <CheckCircle2 size={16} />
                  {submitPOD.isPending ? "Submitting…" : "Confirm Delivery"}
                </button>
                <button
                  onClick={() => { setActivePOD(null); setStatusError(null); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

