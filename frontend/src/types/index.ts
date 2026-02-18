// Core domain types mirroring backend models

export type Role = "OPS_ADMIN" | "OPS_DISPATCHER" | "DRIVER";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  tenant: string;
}

export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export type StopType = "PICKUP" | "DROP";
export type StopStatus = "PENDING" | "ARRIVED" | "COMPLETED" | "SKIPPED";

export interface Stop {
  id: string;
  type: StopType;
  sequence_index: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  pincode: string;
  lat?: number;
  lng?: number;
  status: StopStatus;
  scheduled_eta?: string;
  actual_arrival_time?: string;
}

export interface POD {
  id: string;
  receiver_name: string;
  photo?: string;
  signature?: string;
  delivered_at: string;
  notes?: string;
}

export interface StatusHistory {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_type: "OPS" | "DRIVER" | "SYSTEM";
  actor_name: string | null;
  notes: string;
  created_at: string;
}

export interface Order {
  id: string;
  reference_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  status: OrderStatus;
  tracking_token: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  pickup_window_start?: string;
  pickup_window_end?: string;
  drop_window_start?: string;
  drop_window_end?: string;
  stops: Stop[];
  pod?: POD;
  status_history?: StatusHistory[];
  assigned_route?: string | null;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  current_lat?: number;
  current_lng?: number;
  location_updated_at?: string;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  type: "BIKE" | "VAN" | "TRUCK" | "TEMPO";
  capacity_kg: number;
  is_active: boolean;
}

export type RouteStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Route {
  id: string;
  route_date: string;
  driver: Driver;
  vehicle: Vehicle;
  status: RouteStatus;
  orders: Order[];
  start_time?: string;
  end_time?: string;
}

export type ExceptionType =
  | "DELAY"
  | "FAILED_ATTEMPT"
  | "WRONG_ADDRESS"
  | "CUSTOMER_UNAVAILABLE"
  | "DAMAGED"
  | "OTHER";

export type ExceptionStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface LogisticsException {
  id: string;
  order: string;
  order_reference: string;
  type: ExceptionType;
  status: ExceptionStatus;
  description: string;
  notes: string;
  resolution: string;
  created_at: string;
}

export interface TrackingData {
  reference_code: string;
  customer_name: string;
  status: OrderStatus;
  stops: Pick<Stop, "id" | "type" | "address_line1" | "city" | "status" | "scheduled_eta">[];
  pod_summary?: { receiver_name: string; delivered_at: string };
  last_update: string | null;
}
