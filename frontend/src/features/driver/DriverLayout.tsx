import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Home, LogOut, Truck } from "lucide-react";
import { clsx } from "clsx";

const NAV = [
  { to: "/driver", icon: Home, label: "Home", end: true },
];

export default function DriverLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between bg-gradient-to-r from-brand-700 to-brand-800 dark:from-brand-800 dark:to-brand-900 px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
            <Truck size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">CargoFlow</p>
            <p className="text-xs text-brand-200">{user?.tenant?.name ?? "Driver Portal"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{user?.full_name}</p>
            <p className="text-xs text-brand-200">{user?.email}</p>
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="flex border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
