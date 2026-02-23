import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/api/endpoints";
import { useAuth } from "./AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Package } from "lucide-react";

const schema = z.object({
  tenant_name: z.string().min(2, "Company name is required"),
  tenant_slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  email: z.string().email(),
  password: z.string().min(8, "Minimum 8 characters"),
  full_name: z.string().min(2, "Name is required"),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
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
      await authApi.register(data);
      await login(data.email, data.password);
      navigate("/ops");
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const first = Object.values(err.response?.data ?? {})[0];
      setApiError(Array.isArray(first) ? first[0] : "Registration failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      {/* Theme toggle - top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-brand-700 dark:text-brand-400">
            <Package size={28} />
            CargoFlow
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create your logistics account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
                <input className="input-field" {...register("tenant_name")} />
                {errors.tenant_name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tenant_name.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
                <input className="input-field" placeholder="my-company" {...register("tenant_slug")} />
                {errors.tenant_slug && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tenant_slug.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Your Name</label>
              <input className="input-field" {...register("full_name")} />
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input type="email" className="input-field" {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input type="password" className="input-field" {...register("password")} />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>

            {apiError && (
              <p className="rounded bg-red-50 dark:bg-red-900/30 border dark:border-red-800 p-2 text-sm text-red-600 dark:text-red-400">{apiError}</p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
              {isSubmitting ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
