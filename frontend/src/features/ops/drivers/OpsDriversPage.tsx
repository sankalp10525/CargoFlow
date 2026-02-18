import { useQuery } from "@tanstack/react-query";
import { driversApi } from "@/api/endpoints";
import type { Driver } from "@/types";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { MapPin } from "lucide-react";

export default function OpsDriversPage() {
  const { data: drivers, isLoading, isError } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list().then((r) => r.data),
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError) return <div className="p-6"><ErrorMessage /></div>;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Drivers</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drivers?.map((d) => (
          <div key={d.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{d.name}</p>
                <p className="text-sm text-gray-400">{d.phone}</p>
              </div>
              <span
                className={`status-badge ${d.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}
              >
                {d.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {d.current_lat && d.current_lng && (
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <MapPin size={12} />
                {d.current_lat.toFixed(5)}, {d.current_lng.toFixed(5)}
              </p>
            )}
          </div>
        ))}
        {drivers?.length === 0 && <p className="text-gray-400">No drivers yet.</p>}
      </div>
    </div>
  );
}
