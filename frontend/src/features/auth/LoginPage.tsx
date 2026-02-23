import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "./AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Truck } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setApiError("");
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setApiError(err.response?.data?.detail ?? "Login failed. Check credentials.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 dark:from-gray-950 dark:via-gray-900 dark:to-brand-950">
      {/* Theme toggle - top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-xl">
              <Truck size={24} />
            </div>
            <span className="text-3xl font-bold">CargoFlow</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">Logistics made simple</h2>
          <p className="text-gray-400 leading-relaxed">
            Manage your delivery operations from a single, powerful platform. 
            Track orders, assign drivers, and delight customers.
          </p>
          <div className="mt-8 space-y-3">
            {["Real-time order tracking", "Smart route optimization", "Driver mobile app", "Customer tracking links"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <div className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-6 lg:hidden flex items-center gap-2 text-white text-xl font-bold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
              <Truck size={18} />
            </div>
            CargoFlow
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl">
            <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Sign in to your operations dashboard</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  className="input-field"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="input-field"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
                )}
              </div>

              {apiError && (
                <p className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">{apiError}</p>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-2.5">
                {isSubmitting ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-sm text-gray-400">
            No account?{" "}
            <Link to="/register" className="font-medium text-brand-400 hover:text-brand-300 transition-colors">
              Register your company
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
