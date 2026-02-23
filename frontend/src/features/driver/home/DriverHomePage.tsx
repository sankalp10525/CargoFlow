import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { driverApi } from "@/api/endpoints";
import type { Route } from "@/types";
import { RouteStatusBadge, OrderStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import { MapPin, Package, TruckIcon, Calendar, ArrowRight, CheckCircle2, Clock } from "lucide-react";

export default function DriverHomePage() {
  const { data: route, isLoading, isError } = useQuery<Route>({
    queryKey: ["driver-today-route"],
    queryFn: () => driverApi.todayRoute().then((r) => r.data),
    retry: false,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !route) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4 text-center animate-fade-in">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <TruckIcon size={36} className="text-gray-300 dark:text-gray-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No route today</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back later or contact your dispatcher.</p>
        </div>
      </div>
    );
  }

  const completedOrders = route.orders?.filter((o) => o.status === "DELIVERED").length ?? 0;
  const totalOrders = route.orders?.length ?? 0;
  const progressPct = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Route summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-brand-200 font-medium mb-1 flex items-center gap-1">
              <Calendar size={11} /> Today's Route
            </p>
            <h2 className="text-xl font-bold">{route.route_date}</h2>
          </div>
          <RouteStatusBadge status={route.status} />
        </div>

        <div className="flex items-center gap-4 text-sm text-brand-200 mb-4">
          <span className="flex items-center gap-1.5">
            <TruckIcon size={13} />
            {route.vehicle?.plate_number} · {route.vehicle?.type}
          </span>
          <span className="flex items-center gap-1.5">
            <Package size={13} />
            {totalOrders} orders
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-brand-200 mb-1.5">
            <span>{completedOrders} of {totalOrders} delivered</span>
            <span className="font-semibold">{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        {(route.status === "PLANNED" || route.status === "IN_PROGRESS") && (
          <Link
            to={`/driver/route/${route.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
          >
            {route.status === "PLANNED" ? "Start Route" : "Continue Route"}
            <ArrowRight size={15} />
          </Link>
        )}
        {route.status === "COMPLETED" && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white">
            <CheckCircle2 size={15} /> Route Completed
          </div>
        )}
      </div>

      {/* Orders list */}
      <div>
        <h3 className="mb-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 px-1">Order Stops</h3>
        <div className="space-y-2">
          {route.orders?.map((order, idx) => {
            const lastStop = order.stops?.[order.stops.length - 1];
            return (
              <Link
                key={order.id}
                to={`/driver/route/${route.id}`}
                className="flex items-start gap-3 card card-hover"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{order.reference_code}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{order.customer_name}</p>
                  {lastStop && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      <MapPin size={10} className="shrink-0" />
                      {lastStop.address_line}, {lastStop.city}
                    </p>
                  )}
                  {lastStop?.scheduled_eta && (
                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Clock size={10} className="shrink-0" />
                      ETA: {new Date(lastStop.scheduled_eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
