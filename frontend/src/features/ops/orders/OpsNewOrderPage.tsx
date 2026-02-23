import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/endpoints";
import { ArrowLeft, Plus, Trash2, Package, MapPin, Sparkles } from "lucide-react";
import { useToast } from "@/components/Toast";

interface StopForm {
  type: "PICKUP" | "DROP";
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  lat?: number;
  lng?: number;
}

interface OrderForm {
  reference_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  notes: string;
  stops: StopForm[];
}

const emptyStop = (): StopForm => ({
  type: "DROP",
  address_line: "",
  city: "",
  state: "",
  postal_code: "",
});

const initialForm: OrderForm = {
  reference_code: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  notes: "",
  stops: [{ ...emptyStop(), type: "PICKUP" }, emptyStop()],
};

function generateRef() {
  return `CF-${Date.now().toString().slice(-5)}`;
}

export default function OpsNewOrderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState<OrderForm>({
    ...initialForm,
    reference_code: generateRef(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useMutation({
    mutationFn: () => {
      const payload = {
        reference_code: form.reference_code,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        customer_email: form.customer_email,
        notes: form.notes,
        stops: form.stops.map((s, i) => ({
          sequence_index: i + 1,
          type: s.type,
          address_line: s.address_line,
          city: s.city,
          state: s.state,
          postal_code: s.postal_code,
          ...(s.lat !== undefined && { lat: s.lat }),
          ...(s.lng !== undefined && { lng: s.lng }),
        })),
      };
      return ordersApi.create(payload);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      success(`Order ${form.reference_code} created!`);
      navigate(`/ops/orders/${res.data.id}`);
    },
    onError: (err: { response?: { data?: { detail?: string; reference_code?: string[] } } }) => {
      const detail =
        err.response?.data?.detail ??
        err.response?.data?.reference_code?.[0] ??
        "Failed to create order.";
      toastError(detail);
    },
  });

  const setField = (field: keyof Omit<OrderForm, "stops">, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setStopField = (index: number, field: keyof StopForm, value: string) => {
    setForm((prev) => {
      const stops = prev.stops.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      );
      return { ...prev, stops };
    });
  };

  const addStop = () =>
    setForm((prev) => ({ ...prev, stops: [...prev.stops, emptyStop()] }));

  const removeStop = (index: number) =>
    setForm((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index),
    }));

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.reference_code.trim()) errs.reference_code = "Required";
    if (!form.customer_name.trim()) errs.customer_name = "Required";
    if (!form.customer_phone.trim()) errs.customer_phone = "Required";
    if (form.stops.length < 2) errs.stops = "At least two stops are required";
    const hasPickup = form.stops.some((s) => s.type === "PICKUP");
    const hasDrop = form.stops.some((s) => s.type === "DROP");
    if (!hasPickup) errs.stops = "At least one PICKUP stop is required";
    if (!hasDrop) errs.stops = (errs.stops ? errs.stops + "; " : "") + "At least one DROP stop is required";
    form.stops.forEach((s, i) => {
      if (!s.address_line.trim()) errs[`stop_${i}_address`] = "Required";
      if (!s.city.trim()) errs[`stop_${i}_city`] = "Required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) create.mutate();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <Link
        to="/ops/orders"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Orders
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-900">
          <Package size={20} className="text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Order</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Order Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Package size={16} className="text-brand-500 dark:text-brand-400" />
            Order Details
          </h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reference Code <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                value={form.reference_code}
                onChange={(e) => setField("reference_code", e.target.value)}
                placeholder="CF-10001"
              />
              <button
                type="button"
                onClick={() => setField("reference_code", generateRef())}
                className="btn-secondary text-xs px-3"
                title="Generate reference code"
              >
                <Sparkles size={14} />
              </button>
            </div>
            {errors.reference_code && (
              <p className="mt-1 text-xs text-red-500">{errors.reference_code}</p>
            )}
          </div>
        </div>

        {/* Customer Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Customer Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                className="input-field"
                value={form.customer_name}
                onChange={(e) => setField("customer_name", e.target.value)}
                placeholder="Ananya Sharma"
              />
              {errors.customer_name && (
                <p className="mt-1 text-xs text-red-500">{errors.customer_name}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                className="input-field"
                type="tel"
                value={form.customer_phone}
                onChange={(e) => setField("customer_phone", e.target.value)}
                placeholder="+91 98765 43210"
              />
              {errors.customer_phone && (
                <p className="mt-1 text-xs text-red-500">{errors.customer_phone}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input
              className="input-field"
              type="email"
              value={form.customer_email}
              onChange={(e) => setField("customer_email", e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Fragile items, handle with care…"
            />
          </div>
        </div>

        {/* Stops */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <MapPin size={16} className="text-brand-500 dark:text-brand-400" />
              Stops ({form.stops.length})
            </h2>
            <button
              type="button"
              onClick={addStop}
              className="btn-secondary text-xs py-1.5"
            >
              <Plus size={13} /> Add Stop
            </button>
          </div>

          {errors.stops && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{errors.stops}</p>
          )}

          {form.stops.map((stop, i) => (
            <div
              key={i}
              className={`rounded-xl border-2 p-4 transition-colors ${
                stop.type === "PICKUP"
                  ? "border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
                  : "border-green-100 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      stop.type === "PICKUP"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <select
                    className={`rounded-lg border px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 ${
                      stop.type === "PICKUP"
                        ? "border-blue-200 bg-blue-50 text-blue-700 focus:ring-blue-500/20"
                        : "border-green-200 bg-green-50 text-green-700 focus:ring-green-500/20"
                    }`}
                    value={stop.type}
                    onChange={(e) =>
                      setStopField(i, "type", e.target.value as "PICKUP" | "DROP")
                    }
                  >
                    <option value="PICKUP">📦 PICKUP</option>
                    <option value="DROP">🎯 DROP</option>
                  </select>
                </div>
                {form.stops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeStop(i)}
                    className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-field"
                    value={stop.address_line}
                    onChange={(e) => setStopField(i, "address_line", e.target.value)}
                    placeholder="123 Main St, Building A"
                  />
                  {errors[`stop_${i}_address`] && (
                    <p className="mt-1 text-xs text-red-500">{errors[`stop_${i}_address`]}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input-field"
                    value={stop.city}
                    onChange={(e) => setStopField(i, "city", e.target.value)}
                    placeholder="Mumbai"
                  />
                  {errors[`stop_${i}_city`] && (
                    <p className="mt-1 text-xs text-red-500">{errors[`stop_${i}_city`]}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">State</label>
                  <input
                    className="input-field"
                    value={stop.state}
                    onChange={(e) => setStopField(i, "state", e.target.value)}
                    placeholder="Maharashtra"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Postal Code</label>
                  <input
                    className="input-field"
                    value={stop.postal_code}
                    onChange={(e) => setStopField(i, "postal_code", e.target.value)}
                    placeholder="400001"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Coordinates (optional — for route optimization)
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="input-field"
                      type="number"
                      step="any"
                      value={stop.lat ?? ""}
                      onChange={(e) =>
                        setStopField(
                          i,
                          "lat",
                          e.target.value as unknown as string,
                        )
                      }
                      placeholder="Latitude (12.9716)"
                    />
                    <input
                      className="input-field"
                      type="number"
                      step="any"
                      value={stop.lng ?? ""}
                      onChange={(e) =>
                        setStopField(
                          i,
                          "lng",
                          e.target.value as unknown as string,
                        )
                      }
                      placeholder="Longitude (77.5946)"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-6">
          <button
            type="submit"
            disabled={create.isPending}
            className="btn-primary flex-1 justify-center py-3 text-base"
          >
            {create.isPending ? "Creating order…" : "Create Order"}
          </button>
          <Link to="/ops/orders" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
