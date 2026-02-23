import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { routesApi } from "@/api/endpoints";
import type { Route } from "@/types";
import { RouteStatusBadge, OrderStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { ArrowLeft, MapPin, Package, Calendar, Truck, Hash, Clock, CheckCircle2, ExternalLink } from "lucide-react";

export default function OpsRouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  void qc;

  const { data: route, isLoading, isError } = useQuery<Route>({
    queryKey: ["routes", id],
    queryFn: () => routesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError || !route) return <div className="p-6"><ErrorMessage /></div>;

  const completedOrders = route.orders?.filter((o) => o.status === "DELIVERED").length ?? 0;
  const totalOrders = route.orders?.length ?? 0;
  const progressPct = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <Link
        to="/ops/routes"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Routes
      </Link>

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Route Detail</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Calendar size={13} /> {route.route_date}
          </p>
        </div>
        <RouteStatusBadge status={route.status} />
      </div>

      {/* Info cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalOrders}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Orders</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedOrders}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Delivered</p>
        </div>
        <div className="card text-center py-3 sm:col-span-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>Progress</span><span>{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 dark:bg-brand-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Driver & Vehicle */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900">
              <Package size={14} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Driver</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{route.driver?.name ?? "Unassigned"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900">
              <Truck size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Vehicle</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{route.vehicle?.plate_number ?? "—"}</p>
            </div>
          </div>
          {(route.start_time || route.end_time) && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                <Clock size={14} className="text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{route.end_time ? "Completed" : "Started"}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {new Date(route.end_time ?? route.start_time!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="card">
        <h2 className="mb-4 font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Hash size={15} className="text-brand-500 dark:text-brand-400" />
          Orders on this Route
        </h2>
        <div className="space-y-2">
          {route.orders?.map((order, idx) => (
            <div
              key={order.id}
              className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 hover:border-brand-200 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-900/20 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
                    {idx + 1}
                  </span>
                  <span className="font-mono text-sm font-semibold text-brand-600 dark:text-brand-400">
                    {order.reference_code}
                  </span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{order.customer_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{order.customer_phone}</p>
              <div className="mt-2 space-y-1">
                {order.stops?.map((stop) => (
                  <div key={stop.id} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin size={10} className="shrink-0" />
                    <span
                      className={`rounded px-1 py-0.5 text-xs font-medium ${
                        stop.type === "PICKUP"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {stop.type}
                    </span>
                    {stop.address_line}, {stop.city}
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                {order.status === "DELIVERED" && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 size={12} /> Delivered
                  </span>
                )}
                <Link
                  to={`/ops/orders/${order.id}`}
                  className="ml-auto flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                >
                  View order <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          ))}
          {route.orders?.length === 0 && (
            <div className="py-8 text-center text-gray-400 dark:text-gray-500">
              <Package size={28} className="mx-auto mb-2 text-gray-200 dark:text-gray-600" />
              <p className="text-sm">No orders on this route.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


