export type AgendaItem = {
  schedule_id: string;
  class_type_id: string;
  class_name: string;
  description: string | null;
  location: string | null;
  city: string | null;
  price_cop: number | null;
  instructor: string | null;
  class_date: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  booked: number;
};

export type Booking = {
  id: string;
  user_id: string;
  schedule_id: string | null;
  class_date: string;
  starts_at: string;
  class_name: string;
  location: string | null;
  price_cop: number | null;
  payment_url: string | null;
  status: "pendiente_pago" | "pagada" | "cancelada";
  created_at: string;
  cancelled_at: string | null;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
};

export type ClassType = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  city: string | null;
  price_cop: number | null;
  payment_url: string | null;
  capacity: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
};

export type ClassSchedule = {
  id: string;
  class_type_id: string;
  weekday: number;
  start_time: string;
  instructor: string | null;
  active: boolean;
};
