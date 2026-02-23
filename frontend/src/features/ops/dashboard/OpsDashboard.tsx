import { useQuery } from "@tanstack/react-query";
import { ordersApi, exceptionsApi, routesApi } from "@/api/endpoints";
import { MapPin, AlertTriangle, CheckCircle2, TruckIcon, Package, ArrowRight, RefreshCw, Zap } from "lucide-react";
import Spinner from "@/components/Spinner";
import type { Order, Route, LogisticsException } from "@/types";
import { OrderStatusBadge } from "@/components/StatusBadge";
import { Link } from "react-router-dom";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  delay?: string;
}

function StatCard({ label, value, icon: Icon, gradient, iconColor, delay = "" }: StatCardProps) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${gradient} animate-fade-in`} style={delay ? { animationDelay: delay } : undefined}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        </div>
        <div className={`rounded-xl p-2.5 bg-white/60 dark:bg-gray-700/60 ${iconColor}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function OpsDashboard() {
  const { data: orders, isLoading: loadingOrders, refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list().then((r) => r.data),
  });

  const { data: routes, isLoading: loadingRoutes, refetch: refetchRoutes } = useQuery<Route[]>({
    queryKey: ["routes"],
    queryFn: () => routesApi.list().then((r) => r.data),
  });

  const { data: exceptions, isLoading: loadingExceptions, refetch: refetchExceptions } = useQuery<LogisticsException[]>({
    queryKey: ["exceptions"],
    queryFn: () => exceptionsApi.list().then((r) => r.data),
  });

  const isLoading = loadingOrders || loadingRoutes || loadingExceptions;

  const handleRefresh = () => {
    refetchOrders();
    refetchRoutes();
    refetchExceptions();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Spinner size={32} />
      </div>
    );
  }

  const inTransit = orders?.filter((o) => o.status === "IN_TRANSIT").length ?? 0;
  const delivered = orders?.filter((o) => o.status === "DELIVERED").length ?? 0;
  const openExceptions = exceptions?.filter((e) => e.status === "OPEN").length ?? 0;
  const activeRoutes = routes?.filter((r) => r.status === "IN_PROGRESS").length ?? 0;
  const totalOrders = orders?.length ?? 0;

  return (
    <div className="p-6 animate-fade-in">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeRoutes > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Zap size={11} className="animate-bounce-light" />
              {activeRoutes} route{activeRoutes > 1 ? "s" : ""} live
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="btn-secondary py-1.5 px-3 text-xs"
            title="Refresh data"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <StatCard
          label="In Transit"
          value={inTransit}
          icon={TruckIcon}
          gradient="bg-gradient-to-br from-amber-50 to-orange-100"
          iconColor="text-amber-600"
          delay="0ms"
        />
        <StatCard
          label="Delivered Today"
          value={delivered}
          icon={CheckCircle2}
          gradient="bg-gradient-to-br from-emerald-50 to-green-100"
          iconColor="text-emerald-600"
          delay="60ms"
        />
        <StatCard
          label="Active Routes"
          value={activeRoutes}
          icon={MapPin}
          gradient="bg-gradient-to-br from-blue-50 to-sky-100"
          iconColor="text-blue-600"
          delay="120ms"
        />
        <StatCard
          label="Open Issues"
          value={openExceptions}
          icon={AlertTriangle}
          gradient="bg-gradient-to-br from-red-50 to-rose-100"
          iconColor="text-red-600"
          delay="180ms"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Recent Orders</h2>
            <Link to="/ops/orders" className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {orders && orders.length > 0 ? (
            <div className="space-y-1">
              {orders.slice(0, 8).map((o) => (
                <Link
                  key={o.id}
                  to={`/ops/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900 group-hover:bg-brand-100 dark:group-hover:bg-brand-800 transition-colors">
                    <Package size={14} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">{o.reference_code}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{o.customer_name}</p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                  <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Package size={32} className="mx-auto mb-2 text-gray-200 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No orders yet.</p>
              <Link to="/ops/orders/new" className="mt-2 inline-block text-sm text-brand-600 dark:text-brand-400 hover:underline">
                Create first order →
              </Link>
            </div>
          )}
        </div>

        {/* Quick summary */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-3 font-semibold text-gray-800 dark:text-gray-100">Order Summary</h2>
            <div className="space-y-2">
              {[
                { label: "Total", value: totalOrders, color: "bg-gray-300 dark:bg-gray-600" },
                { label: "Created", value: orders?.filter((o) => o.status === "CREATED").length ?? 0, color: "bg-blue-300 dark:bg-blue-600" },
                { label: "Assigned", value: orders?.filter((o) => o.status === "ASSIGNED").length ?? 0, color: "bg-purple-300 dark:bg-purple-600" },
                { label: "In Transit", value: inTransit, color: "bg-amber-300 dark:bg-amber-600" },
                { label: "Delivered", value: delivered, color: "bg-green-300 dark:bg-green-600" },
                { label: "Failed / Cancelled", value: orders?.filter((o) => ["FAILED","CANCELLED"].includes(o.status)).length ?? 0, color: "bg-red-300 dark:bg-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {openExceptions > 0 && (
            <div className="card border-red-100 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-800 dark:text-red-300 text-sm">Attention Required</h3>
              </div>
              <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                {openExceptions} open exception{openExceptions > 1 ? "s" : ""} need{openExceptions === 1 ? "s" : ""} review.
              </p>
              <Link to="/ops/exceptions" className="text-xs font-medium text-red-700 dark:text-red-400 hover:underline flex items-center gap-1">
                Review exceptions <ArrowRight size={11} />
              </Link>
            </div>
          )}

          {activeRoutes > 0 && (
            <div className="card border-brand-100 dark:border-brand-800 bg-gradient-to-br from-brand-50 to-sky-50 dark:from-brand-900/20 dark:to-sky-900/20">
              <div className="flex items-center gap-2 mb-2">
                <TruckIcon size={16} className="text-brand-600 dark:text-brand-400" />
                <h3 className="font-semibold text-brand-800 dark:text-brand-300 text-sm">Active Routes</h3>
              </div>
              <p className="text-sm text-brand-700 dark:text-brand-400 mb-3">
                {activeRoutes} route{activeRoutes > 1 ? "s" : ""} currently in progress.
              </p>
              <Link to="/ops/routes" className="text-xs font-medium text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1">
                View routes <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
