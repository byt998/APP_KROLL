export type Profile = {
  id: string;
  phone: string | null;
  auth_email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  created_at?: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type City = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOrder = {
  id: string;
  city_id: string;
  title: string;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
};

export type CityWithStats = City & {
  total_orders: number;
  completed_orders: number;
  active_orders: number;
};
