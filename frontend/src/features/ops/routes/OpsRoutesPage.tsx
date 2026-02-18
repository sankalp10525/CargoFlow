import { useQuery } from "@tanstack/react-query";
import { routesApi } from "@/api/endpoints";
import type { Route } from "@/types";
import { RouteStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";

export default function OpsRoutesPage() {
  const { data: routes, isLoading, isError } = useQuery<Route[]>({
    queryKey: ["routes"],
    queryFn: () => routesApi.list().then((r) => r.data),
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError) return <div className="p-6"><ErrorMessage /></div>;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Routes</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routes?.map((route) => (
          <div key={route.id} className="card hover:shadow-md transition-shadow">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{route.route_date}</span>
              <RouteStatusBadge status={route.status} />
            </div>
            <p className="font-semibold text-gray-900">{route.driver.name}</p>
            <p className="text-xs text-gray-400">{route.vehicle.plate_number} · {route.vehicle.type}</p>
            <p className="mt-2 text-sm text-gray-500">{route.orders?.length ?? 0} orders</p>
          </div>
        ))}
        {routes?.length === 0 && (
          <p className="text-gray-400 col-span-3">No routes found.</p>
        )}
      </div>
    </div>
  );
}
