import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { RequireAuth } from "@/features/auth/RequireAuth";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import OpsLayout from "@/features/ops/OpsLayout";
import OpsDashboard from "@/features/ops/dashboard/OpsDashboard";
import OpsOrdersPage from "@/features/ops/orders/OpsOrdersPage";
import OpsOrderDetailPage from "@/features/ops/orders/OpsOrderDetailPage";
import OpsNewOrderPage from "@/features/ops/orders/OpsNewOrderPage";
import OpsRoutesPage from "@/features/ops/routes/OpsRoutesPage";
import OpsRouteDetailPage from "@/features/ops/routes/OpsRouteDetailPage";
import OpsDriversPage from "@/features/ops/drivers/OpsDriversPage";
import OpsExceptionsPage from "@/features/ops/exceptions/OpsExceptionsPage";
import DriverLayout from "@/features/driver/DriverLayout";
import DriverHomePage from "@/features/driver/home/DriverHomePage";
import DriverRouteDetailPage from "@/features/driver/route/DriverRouteDetailPage";
import TrackingPage from "@/features/tracking/TrackingPage";
import NotFoundPage from "@/components/NotFoundPage";

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "DRIVER") return <Navigate to="/driver" replace />;
  return <Navigate to="/ops" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/track/:trackingToken" element={<TrackingPage />} />

            {/* Ops */}
            <Route
              path="/ops"
              element={
                <RequireAuth roles={["OPS_ADMIN", "OPS_DISPATCHER"]}>
                  <OpsLayout />
                </RequireAuth>
              }
            >
              <Route index element={<OpsDashboard />} />
              <Route path="orders" element={<OpsOrdersPage />} />
              <Route path="orders/new" element={<OpsNewOrderPage />} />
              <Route path="orders/:id" element={<OpsOrderDetailPage />} />
              <Route path="routes" element={<OpsRoutesPage />} />
              <Route path="routes/:id" element={<OpsRouteDetailPage />} />
              <Route path="drivers" element={<OpsDriversPage />} />
              <Route path="exceptions" element={<OpsExceptionsPage />} />
            </Route>

            {/* Driver */}
            <Route
              path="/driver"
              element={
                <RequireAuth roles={["DRIVER"]}>
                  <DriverLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DriverHomePage />} />
              <Route path="route/:id" element={<DriverRouteDetailPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
