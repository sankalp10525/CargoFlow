import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { driversApi, vehiclesApi } from "@/api/endpoints";
import type { Driver, Vehicle } from "@/types";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { MapPin, Plus, X, User, Truck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/Toast";

interface DriverForm {
  name: string;
  phone: string;
  email: string;
  password: string;
}

interface VehicleForm {
  plate_number: string;
  type: "BIKE" | "VAN" | "TRUCK" | "TEMPO";
  capacity_kg: string;
}

export default function OpsDriversPage() {
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<"drivers" | "vehicles">("drivers");
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [showCreateVehicle, setShowCreateVehicle] = useState(false);
  const [driverForm, setDriverForm] = useState<DriverForm>({ name: "", phone: "", email: "", password: "" });
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>({ plate_number: "", type: "VAN", capacity_kg: "" });

  const { data: drivers, isLoading: loadingDrivers, isError: errorDrivers } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list().then((r) => r.data),
  });

  const { data: vehicles, isLoading: loadingVehicles, isError: errorVehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list().then((r) => r.data),
  });

  const createDriver = useMutation({
    mutationFn: () => driversApi.create(driverForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      setShowCreateDriver(false);
      setDriverForm({ name: "", phone: "", email: "", password: "" });
      success("Driver added successfully!");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toastError(err.response?.data?.detail ?? "Failed to add driver.");
    },
  });

  const createVehicle = useMutation({
    mutationFn: () =>
      vehiclesApi.create({
        ...vehicleForm,
        capacity_kg: parseInt(vehicleForm.capacity_kg) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setShowCreateVehicle(false);
      setVehicleForm({ plate_number: "", type: "VAN", capacity_kg: "" });
      success("Vehicle added successfully!");
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toastError(err.response?.data?.detail ?? "Failed to add vehicle.");
    },
  });

  const isLoading = loadingDrivers || loadingVehicles;
  const isError = errorDrivers || errorVehicles;

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError) return <div className="p-6"><ErrorMessage /></div>;

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fleet Management</h1>
        <button
          onClick={() => (tab === "drivers" ? setShowCreateDriver(true) : setShowCreateVehicle(true))}
          className="btn-primary"
        >
          <Plus size={16} /> {tab === "drivers" ? "Add Driver" : "Add Vehicle"}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 w-fit">
        {(["drivers", "vehicles"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200 ${
              tab === t
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t === "drivers" ? `Drivers (${drivers?.length ?? 0})` : `Vehicles (${vehicles?.length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Drivers grid */}
      {tab === "drivers" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers?.map((d) => (
            <div key={d.id} className="card hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800">
                    <User size={20} className="text-brand-700 dark:text-brand-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{d.name}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">{d.phone}</p>
                  </div>
                </div>
                <span
                  className={`status-badge ${d.is_active ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"}`}
                >
                  {d.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              {d.current_lat && d.current_lng ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
                  <MapPin size={12} className="text-brand-500 dark:text-brand-400" />
                  {d.current_lat.toFixed(5)}, {d.current_lng.toFixed(5)}
                  {d.location_updated_at && (
                    <span className="ml-auto text-gray-300 dark:text-gray-600">
                      {new Date(d.location_updated_at).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-300">
                  <MapPin size={12} />
                  Location not available
                </p>
              )}
            </div>
          ))}
          {drivers?.length === 0 && (
            <div className="col-span-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-16 text-center">
              <User size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-600" />
              <p className="font-medium text-gray-500 dark:text-gray-400">No drivers yet.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add drivers to start assigning deliveries.</p>
              <button onClick={() => setShowCreateDriver(true)} className="btn-primary mt-4 mx-auto">
                <Plus size={16} /> Add First Driver
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vehicles grid */}
      {tab === "vehicles" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles?.map((v) => (
            <div key={v.id} className="card hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900">
                    <Truck size={20} className="text-amber-700 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="font-semibold font-mono text-gray-900 dark:text-gray-100">{v.plate_number}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">{v.type}</p>
                  </div>
                </div>
                <span className={`status-badge ${v.is_active ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"}`}>
                  {v.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                <CheckCircle2 size={13} className="text-gray-400 dark:text-gray-500" />
                Capacity: <span className="font-semibold text-gray-700 dark:text-gray-300">{v.capacity_kg} kg</span>
              </div>
            </div>
          ))}
          {vehicles?.length === 0 && (
            <div className="col-span-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-16 text-center">
              <Truck size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-600" />
              <p className="font-medium text-gray-500 dark:text-gray-400">No vehicles yet.</p>
              <button onClick={() => setShowCreateVehicle(true)} className="btn-primary mt-4 mx-auto">
                <Plus size={16} /> Add First Vehicle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Driver Modal */}
      {showCreateDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="card w-full max-w-md shadow-2xl animate-scale-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Driver</h2>
              <button onClick={() => setShowCreateDriver(false)} className="rounded-xl p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
                <input
                  className="input-field"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ravi Kumar"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
                <input
                  className="input-field"
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+919900001111"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Login Email{" "}
                  <span className="text-gray-400 font-normal text-xs">(optional — for driver app)</span>
                </label>
                <input
                  className="input-field"
                  type="email"
                  value={driverForm.email}
                  onChange={(e) => setDriverForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="ravi@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password{" "}
                  <span className="text-gray-400 font-normal text-xs">(min 8 chars)</span>
                </label>
                <input
                  className="input-field"
                  type="password"
                  value={driverForm.password}
                  onChange={(e) => setDriverForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => createDriver.mutate()}
                  disabled={!driverForm.name.trim() || !driverForm.phone.trim() || createDriver.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {createDriver.isPending ? "Adding…" : "Add Driver"}
                </button>
                <button onClick={() => setShowCreateDriver(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Vehicle Modal */}
      {showCreateVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="card w-full max-w-md shadow-2xl animate-scale-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add Vehicle</h2>
              <button onClick={() => setShowCreateVehicle(false)} className="rounded-xl p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Plate Number *</label>
                <input
                  className="input-field uppercase"
                  value={vehicleForm.plate_number}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, plate_number: e.target.value.toUpperCase() }))}
                  placeholder="KA01AB1234"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Type *</label>
                <select
                  className="input-field"
                  value={vehicleForm.type}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, type: e.target.value as VehicleForm["type"] }))}
                >
                  <option value="BIKE">Bike</option>
                  <option value="VAN">Van</option>
                  <option value="TRUCK">Truck</option>
                  <option value="TEMPO">Tempo</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Capacity (kg)</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  value={vehicleForm.capacity_kg}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, capacity_kg: e.target.value }))}
                  placeholder="1200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => createVehicle.mutate()}
                  disabled={!vehicleForm.plate_number.trim() || createVehicle.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {createVehicle.isPending ? "Adding…" : "Add Vehicle"}
                </button>
                <button onClick={() => setShowCreateVehicle(false)} className="btn-secondary">
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
