import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ordersApi } from "@/api/endpoints";
import type { Order } from "@/types";
import { OrderStatusBadge } from "@/components/StatusBadge";
import Spinner from "@/components/Spinner";
import ErrorMessage from "@/components/ErrorMessage";
import { Plus, Search, Package, ChevronRight } from "lucide-react";
import { useState } from "react";

const STATUS_TABS = ["ALL", "CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"] as const;

export default function OpsOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("ALL");

  const { data: orders, isLoading, isError } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list().then((r) => r.data),
  });

  const filtered = orders?.filter((o) => {
    const matchSearch =
      o.reference_code.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search);
    const matchStatus = statusTab === "ALL" || o.status === statusTab;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <div className="flex justify-center p-20"><Spinner size={32} /></div>;
  if (isError) return <div className="p-6"><ErrorMessage /></div>;

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{orders?.length ?? 0} total</p>
        </div>
        <Link to="/ops/orders/new" className="btn-primary">
          <Plus size={16} />
          New Order
        </Link>
      </div>

      {/* Search */}
      <div className="mb-3 relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          className="input-field pl-9"
          placeholder="Search by reference, customer name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab === "ALL"
            ? orders?.length ?? 0
            : orders?.filter((o) => o.status === tab).length ?? 0;
          return (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusTab === tab
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400"
              }`}
            >
              {tab === "ALL" ? "All" : tab.replace("_", " ")}
              {" "}
              <span className={`ml-0.5 ${statusTab === tab ? "opacity-80" : "opacity-60"}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered && filtered.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Stops</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900">
                        <Package size={13} className="text-brand-500 dark:text-brand-400" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {order.reference_code}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{order.customer_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{order.stops?.length ?? 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 hidden md:table-cell">
                    {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/ops/orders/${order.id}`}
                      className="flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline"
                    >
                      View <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card py-14 text-center">
          <Package size={36} className="mx-auto mb-3 text-gray-200 dark:text-gray-600" />
          <p className="font-medium text-gray-500 dark:text-gray-400">
            {search || statusTab !== "ALL" ? "No matching orders" : "No orders yet"}
          </p>
          {!search && statusTab === "ALL" && (
            <Link to="/ops/orders/new" className="btn-primary mt-4 inline-flex">
              <Plus size={15} /> Create first order
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
