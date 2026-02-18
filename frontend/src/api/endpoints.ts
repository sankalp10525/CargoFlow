import api from "./client";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login/", { email, password }),
  register: (data: {
    tenant_name: string;
    tenant_slug: string;
    email: string;
    password: string;
    full_name: string;
  }) => api.post("/auth/register/", data),
  me: () => api.get("/auth/me/"),
  refresh: (refresh: string) => api.post("/auth/refresh/", { refresh }),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: Record<string, string>) => api.get("/ops/orders/", { params }),
  get: (id: string) => api.get(`/ops/orders/${id}/`),
  create: (data: unknown) => api.post("/ops/orders/", data),
  cancel: (id: string, reason: string) =>
    api.post(`/ops/orders/${id}/cancel/`, { reason }),
  reassign: (id: string, data: unknown) =>
    api.post(`/ops/orders/${id}/reassign/`, data),
};

// ── Routes ────────────────────────────────────────────────────────────────────
export const routesApi = {
  list: () => api.get("/ops/routes/"),
  get: (id: string) => api.get(`/ops/routes/${id}/`),
  create: (data: unknown) => api.post("/ops/routes/", data),
  reorder: (id: string, stopOrder: string[]) =>
    api.post(`/ops/routes/${id}/reorder/`, { stop_order: stopOrder }),
};

// ── Drivers ───────────────────────────────────────────────────────────────────
export const driversApi = {
  list: () => api.get("/ops/drivers/"),
  create: (data: unknown) => api.post("/ops/drivers/", data),
};

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const vehiclesApi = {
  list: () => api.get("/ops/vehicles/"),
  create: (data: unknown) => api.post("/ops/vehicles/", data),
};

// ── Exceptions ────────────────────────────────────────────────────────────────
export const exceptionsApi = {
  list: (params?: Record<string, string>) =>
    api.get("/ops/exceptions/", { params }),
  ack: (id: string, note: string) =>
    api.post(`/ops/exceptions/${id}/ack/`, { note }),
  resolve: (id: string, resolution: string) =>
    api.post(`/ops/exceptions/${id}/resolve/`, { resolution }),
};

// ── Driver app ────────────────────────────────────────────────────────────────
export const driverApi = {
  me: () => api.get("/driver/me/"),
  todayRoute: () => api.get("/driver/routes/today/"),
  route: (id: string) => api.get(`/driver/routes/${id}/`),
  startRoute: (id: string) => api.post(`/driver/routes/${id}/start/`),
  updateStatus: (orderId: string, data: unknown) =>
    api.post(`/driver/orders/${orderId}/status/`, data),
  submitPOD: (orderId: string, data: FormData) =>
    api.post(`/driver/orders/${orderId}/pod/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  scan: (code: string) => api.post("/driver/scan/", { code }),
};

// ── Customer tracking ─────────────────────────────────────────────────────────
export const trackingApi = {
  get: (token: string) => api.get(`/tracking/${token}/`),
};
