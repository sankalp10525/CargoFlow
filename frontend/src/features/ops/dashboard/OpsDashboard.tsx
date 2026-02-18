import { useQuery } from "@tanstack/react-query";
import { ordersApi, exceptionsApi, routesApi } from "@/api/endpoints";
import { Package, Map, AlertTriangle, CheckCircle2, TruckIcon } from "lucide-react";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import type { Order, Route, LogisticsException } from "@/types";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`rounded-lg p-3 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function OpsDashboard() {
  const { data: orders, isLoading: loadingOrders, isError: errOrders } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list().then((r) => r.data),
  });

  const { data: routes, isLoading: loadingRoutes } = useQuery<Route[]>({
    queryKey: ["routes"],
    queryFn: () => routesApi.list().then((r) => r.data),
  });

  const { data: exceptions, isLoading: loadingExceptions } = useQuery<LogisticsException[]>({
    queryKey: ["exceptions"],
    queryFn: () => exceptionsApi.list().then((r) => r.data),
  });

  if (loadingOrders || loadingRoutes || loadingExceptions) {
    return (
      <div className="flex items-center justify-center p-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (errOrders) return <ErrorMessage message="Failed to load dashboard data." />;

  const inTransit = orders?.filter((o) => o.status === "IN_TRANSIT").length ?? 0;
  const delivered = orders?.filter((o) => o.status === "DELIVERED").length ?? 0;
  const openExceptions = exceptions?.filter((e) => e.status === "OPEN").length ?? 0;
  const activeRoutes = routes?.filter((r) => r.status === "IN_PROGRESS").length ?? 0;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="In Transit"
          value={inTransit}
          icon={TruckIcon}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          label="Delivered Today"
          value={delivered}
          icon={CheckCircle2}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          label="Active Routes"
          value={activeRoutes}
          icon={Map}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Open Exceptions"
          value={openExceptions}
          icon={AlertTriangle}
          color="bg-red-100 text-red-600"
        />
      </div>

      <div className="mt-8 card">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Recent Orders</h2>
        {orders && orders.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Ref</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs text-brand-600">{o.reference_code}</td>
                  <td className="py-2 pr-4">{o.customer_name}</td>
                  <td className="py-2 pr-4">
                    <span className="status-badge bg-gray-100 text-gray-700">{o.status}</span>
                  </td>
                  <td className="py-2 text-gray-400">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400">No orders yet.</p>
        )}
      </div>
    </div>
  );
}
