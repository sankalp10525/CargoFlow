import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ordersApi } from "@/api/endpoints";
import type { Order } from "@/types";
import { OrderStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function OpsOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id!, cancelReason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError || !order) return <div className="p-6"><ErrorMessage /></div>;

  const canCancel = ["CREATED", "ASSIGNED"].includes(order.status);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/ops/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> Back to Orders
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.reference_code}</h1>
          <p className="text-sm text-gray-500 mt-1">{order.customer_name} · {order.customer_phone}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Tracking link */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <span>Tracking:</span>
        <a
          href={`/track/${order.tracking_token}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-brand-600 hover:underline"
        >
          Public link <ExternalLink size={12} />
        </a>
      </div>

      {/* Stops */}
      <div className="card mb-4">
        <h2 className="mb-3 font-semibold text-gray-800">Stops</h2>
        <ol className="space-y-3">
          {order.stops.map((stop, i) => (
            <li key={stop.id} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">
                  <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500">
                    {stop.type}
                  </span>
                  {stop.address_line1}, {stop.city}
                </p>
                <p className="text-xs text-gray-400">{stop.status}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Status history */}
      {order.status_history && order.status_history.length > 0 && (
        <div className="card mb-4">
          <h2 className="mb-3 font-semibold text-gray-800">Status History</h2>
          <ul className="space-y-2">
            {order.status_history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 text-xs">{new Date(h.created_at).toLocaleString()}</span>
                <span className="text-gray-500">{h.from_status ?? "—"} → {h.to_status}</span>
                <span className="text-gray-400 text-xs">{h.actor_type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cancel */}
      {canCancel && (
        <div className="card border-red-100">
          {!showCancel ? (
            <button onClick={() => setShowCancel(true)} className="btn-danger text-sm">
              Cancel Order
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                className="input-field"
                rows={2}
                placeholder="Reason for cancellation…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => cancel.mutate()}
                  disabled={!cancelReason || cancel.isPending}
                  className="btn-danger"
                >
                  Confirm Cancel
                </button>
                <button onClick={() => setShowCancel(false)} className="btn-secondary">
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
