import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routesApi, driversApi, vehiclesApi, ordersApi } from "@/api/endpoints";
import type { Route, Driver, Vehicle, Order } from "@/types";
import { RouteStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Plus, X, ChevronRight, MapPin, Truck, Calendar, Package } from "lucide-react";
import { useToast } from "@/components/Toast";

interface RouteForm {
  route_date: string;
  driver_id: string;
  vehicle_id: string;
  order_ids: string[];
  optimize: boolean;
}

export default function OpsRoutesPage() {
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<RouteForm>({
    route_date: new Date().toISOString().split("T")[0],
    driver_id: "",
    vehicle_id: "",
    order_ids: [],
    optimize: true,
  });

  const { data: routes, isLoading, isError } = useQuery<Route[]>({
    queryKey: ["routes"],
    queryFn: () => routesApi.list().then((r) => r.data),
  });

  const { data: drivers } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list().then((r) => r.data),
    enabled: showCreate,
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list().then((r) => r.data),
    enabled: showCreate,
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["orders", "CREATED"],
    queryFn: () => ordersApi.list({ status: "CREATED" }).then((r) => r.data),
    enabled: showCreate,
  });

  const resetForm = () => {
    setForm({
      route_date: new Date().toISOString().split("T")[0],
      driver_id: "",
      vehicle_id: "",
      order_ids: [],
      optimize: true,
    });
  };

  const create = useMutation({
    mutationFn: () => routesApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      setShowCreate(false);
      resetForm();
      success("Route created successfully!");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toastError(err.response?.data?.detail ?? "Failed to create route.");
    },
  });

  const toggleOrder = (id: string) => {
    setForm((prev) => ({
      ...prev,
      order_ids: prev.order_ids.includes(id)
        ? prev.order_ids.filter((o) => o !== id)
        : [...prev.order_ids, id],
    }));
  };

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError) return <div className="p-6"><ErrorMessage /></div>;

  const grouped = {
    PLANNED: routes?.filter((r) => r.status === "PLANNED") ?? [],
    IN_PROGRESS: routes?.filter((r) => r.status === "IN_PROGRESS") ?? [],
    COMPLETED: routes?.filter((r) => r.status === "COMPLETED") ?? [],
    CANCELLED: routes?.filter((r) => r.status === "CANCELLED") ?? [],
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Routes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {grouped.IN_PROGRESS.length} active · {grouped.PLANNED.length} planned
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Route
        </button>
      </div>

      {/* Active Routes first */}
      {grouped.IN_PROGRESS.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            🚛 Active Now ({grouped.IN_PROGRESS.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.IN_PROGRESS.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      )}

      {grouped.PLANNED.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            📋 Planned ({grouped.PLANNED.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.PLANNED.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      )}

      {grouped.COMPLETED.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
            ✅ Completed ({grouped.COMPLETED.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.COMPLETED.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      )}

      {routes?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-16 text-center">
          <Truck size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-600" />
          <p className="font-medium text-gray-500 dark:text-gray-400">No routes yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create a route to start assigning deliveries.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 mx-auto">
            <Plus size={16} /> Create First Route
          </button>
        </div>
      )}

      {/* Create Route Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="card w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Create New Route</h2>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="rounded-xl p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar size={14} className="inline mr-1" />
                  Route Date *
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={form.route_date}
                  onChange={(e) => setForm((p) => ({ ...p, route_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Driver *
                </label>
                <select
                  className="input-field"
                  value={form.driver_id}
                  onChange={(e) => setForm((p) => ({ ...p, driver_id: e.target.value }))}
                >
                  <option value="">Select driver…</option>
                  {drivers?.filter((d) => d.is_active).map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.phone}</option>
                  ))}
                </select>
                {drivers?.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No active drivers. Add drivers first.</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Vehicle *
                </label>
                <select
                  className="input-field"
                  value={form.vehicle_id}
                  onChange={(e) => setForm((p) => ({ ...p, vehicle_id: e.target.value }))}
                >
                  <option value="">Select vehicle…</option>
                  {vehicles?.filter((v) => v.is_active).map((v) => (
                    <option key={v.id} value={v.id}>{v.plate_number} ({v.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Package size={14} />
                  Orders to assign{" "}
                  <span className="text-gray-400 dark:text-gray-500 font-normal">(status: CREATED)</span>
                  {form.order_ids.length > 0 && (
                    <span className="ml-auto rounded-full bg-brand-600 text-white text-xs px-2 py-0.5">
                      {form.order_ids.length} selected
                    </span>
                  )}
                </label>
                {orders && orders.length > 0 ? (
                  <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-gray-200 dark:border-gray-600 p-2">
                    {orders.map((o) => (
                      <label
                        key={o.id}
                        className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${
                          form.order_ids.includes(o.id)
                            ? "bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.order_ids.includes(o.id)}
                          onChange={() => toggleOrder(o.id)}
                          className="rounded accent-brand-600"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono text-brand-600 dark:text-brand-400 font-semibold">{o.reference_code}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{o.customer_name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                    <p className="text-sm text-gray-400">No unassigned orders available.</p>
                    <Link to="/ops/orders/new" className="text-xs text-brand-600 hover:underline">
                      Create an order first →
                    </Link>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-gray-200 dark:border-gray-600 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={form.optimize}
                  onChange={(e) => setForm((p) => ({ ...p, optimize: e.target.checked }))}
                  className="rounded accent-brand-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Optimize stop order</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Automatically reorder stops using nearest-neighbor routing</p>
                </div>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => create.mutate()}
                  disabled={
                    !form.driver_id ||
                    !form.vehicle_id ||
                    form.order_ids.length === 0 ||
                    create.isPending
                  }
                  className="btn-primary flex-1 justify-center"
                >
                  {create.isPending ? "Creating…" : "Create Route"}
                </button>
                <button
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RouteCard({ route }: { route: Route }) {
  return (
    <Link
      to={`/ops/routes/${route.id}`}
      className="card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 block group"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
          {route.route_date}
        </span>
        <RouteStatusBadge status={route.status} />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
          <Truck size={13} className="text-brand-600 dark:text-brand-400" />
        </div>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{route.driver?.name}</p>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 pl-9">
        {route.vehicle?.plate_number} · {route.vehicle?.type}
      </p>
      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <MapPin size={13} className="text-gray-400 dark:text-gray-500" />
          {route.orders?.length ?? 0} orders
        </div>
        <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors" />
      </div>
    </Link>
  );
}
