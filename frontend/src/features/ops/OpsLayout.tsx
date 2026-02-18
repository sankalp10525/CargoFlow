import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  LayoutDashboard,
  Package,
  Map,
  Users,
  AlertTriangle,
  LogOut,
  PackageOpen,
} from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { to: "/ops", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/ops/orders", icon: Package, label: "Orders" },
  { to: "/ops/routes", icon: Map, label: "Routes" },
  { to: "/ops/drivers", icon: Users, label: "Drivers" },
  { to: "/ops/exceptions", icon: AlertTriangle, label: "Exceptions" },
];

export default function OpsLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col bg-gray-900 text-gray-100">
        <div className="flex items-center gap-2 px-4 py-5 text-lg font-bold text-white">
          <PackageOpen size={22} />
          CargoFlow
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 px-4 py-3">
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
