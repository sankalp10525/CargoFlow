import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { driverApi } from "@/api/endpoints";
import type { Order, Route } from "@/types";
import { OrderStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const DRIVER_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
};

export default function DriverRouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activePOD, setActivePOD] = useState<Order | null>(null);
  const [podName, setPodName] = useState("");

  const { data: route, isLoading, isError } = useQuery<Route>({
    queryKey: ["driver-route", id],
    queryFn: () => driverApi.route(id!).then((r) => r.data),
    enabled: !!id,
  });

  const startRoute = useMutation({
    mutationFn: () => driverApi.startRoute(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["driver-route", id] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, toStatus }: { orderId: string; toStatus: string }) =>
      driverApi.updateStatus(orderId, { to_status: toStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["driver-route", id] }),
  });

  const submitPOD = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: FormData }) =>
      driverApi.submitPOD(orderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["driver-route", id] });
      setActivePOD(null);
      setPodName("");
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError || !route) return <div className="p-4"><ErrorMessage /></div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Route Detail</h2>
        {route.status === "PLANNED" && (
          <button
            onClick={() => startRoute.mutate()}
            disabled={startRoute.isPending}
            className="btn-primary text-sm"
          >
            Start Route
          </button>
        )}
      </div>

      <div className="space-y-3">
        {route.orders?.map((order) => {
          const next = DRIVER_TRANSITIONS[order.status] ?? [];
          return (
            <div key={order.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{order.reference_code}</p>
                  <p className="text-xs text-gray-500">{order.customer_name} · {order.customer_phone}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="mb-3 space-y-1">
                {order.stops?.map((stop) => (
                  <p key={stop.id} className="text-xs text-gray-500">
                    [{stop.type}] {stop.address_line1}, {stop.city}
                  </p>
                ))}
              </div>

              {/* Action buttons */}
              {route.status === "IN_PROGRESS" && next.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        s === "DELIVERED"
                          ? setActivePOD(order)
                          : updateStatus.mutate({ orderId: order.id, toStatus: s })
                      }
                      className={s === "FAILED" ? "btn-danger text-xs" : "btn-primary text-xs"}
                      disabled={updateStatus.isPending}
                    >
                      {s === "DELIVERED" ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={13} /> Mark Delivered
                        </span>
                      ) : s === "FAILED" ? (
                        <span className="flex items-center gap-1">
                          <XCircle size={13} /> Mark Failed
                        </span>
                      ) : (
                        s
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* POD modal */}
      {activePOD && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="card w-full rounded-b-none shadow-xl">
            <h3 className="mb-3 font-semibold text-gray-900">Proof of Delivery</h3>
            <p className="text-sm text-gray-500 mb-3">{activePOD.reference_code}</p>
            <input
              className="input-field mb-3"
              placeholder="Receiver's name *"
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                disabled={!podName || submitPOD.isPending}
                className="btn-primary flex-1 justify-center"
                onClick={() => {
                  const fd = new FormData();
                  fd.append("receiver_name", podName);
                  submitPOD.mutate({ orderId: activePOD.id, data: fd });
                }}
              >
                Submit POD
              </button>
              <button onClick={() => setActivePOD(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
