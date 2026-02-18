import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { driverApi } from "@/api/endpoints";
import type { Route } from "@/types";
import { RouteStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import { MapPin, Package } from "lucide-react";

export default function DriverHomePage() {
  const { data: route, isLoading, isError } = useQuery<Route>({
    queryKey: ["driver-today-route"],
    queryFn: () => driverApi.todayRoute().then((r) => r.data),
    retry: false,
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
      <div className="flex flex-col items-center justify-center p-12 gap-4 text-center">
        <Package size={48} className="text-gray-200" />
        <p className="text-gray-500">No route assigned for today.</p>
        <p className="text-sm text-gray-400">Check back later or contact your dispatcher.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-gray-900">Today's Route</h2>
          <RouteStatusBadge status={route.status} />
        </div>
        <p className="text-sm text-gray-500">{route.vehicle.plate_number} · {route.vehicle.type}</p>
        <p className="text-sm text-gray-500">{route.orders?.length} orders</p>

        {route.status === "PLANNED" && (
          <Link to={`/driver/route/${route.id}`} className="btn-primary mt-3 w-full justify-center">
            Start Route
          </Link>
        )}
        {route.status === "IN_PROGRESS" && (
          <Link to={`/driver/route/${route.id}`} className="btn-primary mt-3 w-full justify-center">
            Continue Route
          </Link>
        )}
      </div>

      <h3 className="mb-2 text-sm font-semibold text-gray-700">Orders</h3>
      <div className="space-y-2">
        {route.orders?.map((order) => (
          <Link
            key={order.id}
            to={`/driver/route/${route.id}`}
            className="card flex items-start gap-3 hover:shadow-md transition-shadow"
          >
            <div className="mt-0.5 rounded-full bg-brand-100 p-1.5">
              <MapPin size={14} className="text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{order.reference_code}</p>
              <p className="text-xs text-gray-500">{order.customer_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {order.stops?.[order.stops.length - 1]?.address_line1}
              </p>
            </div>
            <span className="ml-auto text-xs font-semibold text-gray-400">{order.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
