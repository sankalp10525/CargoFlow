import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Package,
  Map,
  Users,
  AlertTriangle,
  LogOut,
  Truck,
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 text-gray-100 shadow-xl">
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-lg">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white leading-tight">CargoFlow</p>
            <p className="text-xs text-gray-400">Operations</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-brand-600 text-white shadow-md shadow-brand-900/20"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-300">
              {user?.full_name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors">
            <span className="text-xs font-medium text-gray-300">🌓 Theme</span>
            <ThemeToggle />
          </div>
          
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={13} />
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
