import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "@/types";
import Spinner from "@/components/Spinner";

interface Props {
  children: React.ReactNode;
  roles?: Role[];
}

export function RequireAuth({ children, roles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate area
    if (user.role === "DRIVER") return <Navigate to="/driver" replace />;
    return <Navigate to="/ops" replace />;
  }

  return <>{children}</>;
}
