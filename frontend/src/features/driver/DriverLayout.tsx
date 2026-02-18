import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { Home, MapPin, LogOut, PackageOpen } from "lucide-react";
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
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white shadow-sm">
        <div className="flex items-center gap-2 font-bold">
          <PackageOpen size={20} />
          CargoFlow
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{user?.full_name}</span>
          <button onClick={handleLogout} className="text-white/70 hover:text-white">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="flex border-t bg-white">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center py-2 text-xs",
                isActive ? "text-brand-600 font-semibold" : "text-gray-500"
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
