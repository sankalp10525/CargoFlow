import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ordersApi, routesApi } from "@/api/endpoints";
import type { Order, Route } from "@/types";
import { OrderStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { ArrowLeft, ExternalLink, X, MapPin, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function OpsOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [targetRouteId, setTargetRouteId] = useState("");
  const [reassignNote, setReassignNote] = useState("");

  // Prevent fetching when id is "new" (that's the create page route)
  const isValidUUID = !!id && id !== "new" && id.length > 10;

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.get(id!).then((r) => r.data),
    enabled: isValidUUID,
  });

  const { data: routes } = useQuery<Route[]>({
    queryKey: ["routes"],
    queryFn: () => routesApi.list().then((r) => r.data),
    enabled: showReassign,
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id!, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      setShowCancel(false);
      setCancelReason("");
      success("Order cancelled successfully.");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toastError(err.response?.data?.detail ?? "Failed to cancel order.");
    },
  });

  const reassign = useMutation({
    mutationFn: () =>
      ordersApi.reassign(id!, { target_route_id: targetRouteId, note: reassignNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", id] });
      setShowReassign(false);
      setTargetRouteId("");
      setReassignNote("");
      success("Order reassigned successfully.");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toastError(err.response?.data?.detail ?? "Failed to reassign order.");
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError || !order || !isValidUUID) return <div className="p-6"><ErrorMessage /></div>;

  const canCancel = ["CREATED", "ASSIGNED", "PICKED_UP"].includes(order.status);
  const canReassign = order.status === "ASSIGNED";

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <Link to="/ops/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
        <ArrowLeft size={14} /> Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">{order.reference_code}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {order.customer_name} &middot; {order.customer_phone}
          </p>
          {order.customer_email && (
            <p className="text-xs text-gray-400 mt-0.5">{order.customer_email}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderStatusBadge status={order.status} />
          {order.driver_name && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
              Driver: {order.driver_name}
            </span>
          )}
        </div>
      </div>

      {/* Tracking link */}
      <div className="card mb-4 flex items-center gap-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900 shrink-0">
          <ExternalLink size={14} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Customer Tracking Link</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{order.tracking_token}</p>
        </div>
        <a
          href={`/track/${order.tracking_token}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary text-xs py-1.5 shrink-0"
        >
          Open <ExternalLink size={12} />
        </a>
      </div>

      {/* Route info */}
      {order.route_id && (
        <div className="card mb-4 flex items-center gap-3 py-3 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800 shrink-0">
            <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Assigned to Route</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {order.route_date} &middot; Driver: {order.driver_name ?? "Unknown"}
            </p>
          </div>
          <Link to={`/ops/routes/${order.route_id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View Route →
          </Link>
        </div>
      )}

      {/* Stops */}
      <div className="card mb-4">
        <h2 className="mb-4 font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <MapPin size={16} className="text-brand-500 dark:text-brand-400" />
          Stops ({order.stops.length})
        </h2>
        <ol className="space-y-3">
          {order.stops.map((stop, i) => (
            <li key={stop.id} className="flex gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  stop.status === "COMPLETED"
                    ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                    : "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
                }`}
              >
                {stop.status === "COMPLETED" ? <CheckCircle2 size={14} /> : i + 1}
              </span>
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-medium">
                  <span
                    className={`mr-2 rounded px-1.5 py-0.5 text-xs font-semibold ${
                      stop.type === "PICKUP"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-green-50 text-green-600"
                    }`}
                  >
                    {stop.type}
                  </span>
                  {stop.address_line}, {stop.city}
                  {stop.state && `, ${stop.state}`}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span
                    className={`text-xs font-medium ${
                      stop.status === "COMPLETED"
                        ? "text-green-600"
                        : stop.status === "SKIPPED"
                        ? "text-red-400"
                        : "text-gray-400"
                    }`}
                  >
                    {stop.status}
                  </span>
                  {stop.scheduled_eta && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={11} />
                      ETA: {new Date(stop.scheduled_eta).toLocaleString()}
                    </span>
                  )}
                  {stop.actual_arrival_time && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 size={11} />
                      Arrived: {new Date(stop.actual_arrival_time).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* POD */}
      {order.pod && (
        <div className="card mb-4 border-green-100 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <h2 className="mb-3 font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
            Proof of Delivery
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Receiver</p>
              <p className="font-semibold text-green-900 dark:text-green-100">{order.pod.receiver_name}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Delivered At</p>
              <p className="font-semibold text-green-900 dark:text-green-100">
                {new Date(order.pod.delivered_at).toLocaleString()}
              </p>
            </div>
            {order.pod.notes && (
              <div className="col-span-2">
                <p className="text-xs text-green-600 font-medium">Notes</p>
                <p className="text-green-800">{order.pod.notes}</p>
              </div>
            )}
            {order.pod.photo_url && (
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">Photo</p>
                <a href={order.pod.photo_url} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">View Photo</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status history */}
      {order.status_history && order.status_history.length > 0 && (
        <div className="card mb-4">
          <h2 className="mb-4 font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Clock size={16} className="text-gray-400 dark:text-gray-500" />
            Status History
          </h2>
          <div className="relative">
            <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gray-100 dark:bg-gray-700" />
            <ul className="space-y-3">
              {order.status_history.map((h) => (
                <li key={h.id} className="flex items-start gap-3 pl-2">
                  <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-brand-500 dark:bg-brand-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {h.from_status ? (
                        <span>
                          <span className="text-gray-500">{h.from_status}</span>
                          <span className="mx-1.5 text-gray-400">→</span>
                        </span>
                      ) : null}
                      <span className="text-gray-900">{h.to_status}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                        {h.actor_type}
                      </span>
                      {h.actor_user && (
                        <span className="text-xs text-gray-400">{h.actor_user.full_name}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {canReassign && (
          <button
            onClick={() => setShowReassign(true)}
            className="btn-secondary"
          >
            <RefreshCw size={15} />
            Reassign to Route
          </button>
        )}
        {canCancel && (
          <button onClick={() => setShowCancel(true)} className="btn-danger">
            <X size={15} />
            Cancel Order
          </button>
        )}
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="card w-full max-w-md shadow-2xl animate-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cancel Order</h2>
              <button onClick={() => setShowCancel(false)} className="rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              This will cancel order <span className="font-mono font-semibold">{order.reference_code}</span>.
              This cannot be undone.
            </p>
            <textarea
              className="input-field mb-4"
              rows={3}
              placeholder="Reason for cancellation…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => cancel.mutate()}
                disabled={!cancelReason.trim() || cancel.isPending}
                className="btn-danger flex-1 justify-center"
              >
                {cancel.isPending ? "Cancelling…" : "Confirm Cancel"}
              </button>
              <button onClick={() => setShowCancel(false)} className="btn-secondary">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign modal */}
      {showReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="card w-full max-w-md shadow-2xl animate-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reassign Order</h2>
              <button onClick={() => setShowReassign(false)} className="rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Target Route</label>
                <select
                  className="input-field"
                  value={targetRouteId}
                  onChange={(e) => setTargetRouteId(e.target.value)}
                >
                  <option value="">Select route…</option>
                  {routes
                    ?.filter((r) => r.status === "PLANNED" || r.status === "IN_PROGRESS")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.route_date} — {r.driver?.name} ({r.vehicle?.plate_number})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
                <input
                  className="input-field"
                  placeholder="Reason for reassignment…"
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => reassign.mutate()}
                  disabled={!targetRouteId || reassign.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {reassign.isPending ? "Reassigning…" : "Reassign"}
                </button>
                <button onClick={() => setShowReassign(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

