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
};

export type ImportSourceType = "row_table" | "wide_cost_table";

export type ImportBatch = {
  id: string;
  city_id: string;
  import_name: string;
  original_filename: string | null;
  source_type: ImportSourceType;
  sheets_count: number;
  total_imported_rows_count: number;
  total_skipped_rows_count: number;
  created_at: string;
};

export type ImportSheet = {
  id: string;
  city_id: string;
  import_batch_id: string;
  sheet_name: string;
  sheet_index: number;
  source_type: ImportSourceType;
  imported_rows_count: number;
  skipped_rows_count: number;
  created_orders_count: number;
  created_at: string;
};

export type ImportedOrder = {
  id: string;
  city_id: string;
  import_batch_id: string;
  import_sheet_id: string;
  source_type: ImportSourceType;
  source_row_number: number | null;
  source_column_name: string | null;
  address: string | null;
  decision_number: string | null;
  case_number: string | null;
  work_scope: string | null;
  species: string | null;
  circumference: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price_net: number | null;
  unit_price_gross: number | null;
  total_value_net: number | null;
  total_value_gross: number | null;
  notes: string | null;
  raw_data: Record<string, unknown> | null;
  is_removed: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  city_id: string;
  import_batch_id: string | null;
  import_sheet_id: string | null;
  assigned_to: string | null;
  order_name: string | null;
  description: string | null;
  status: "active" | "completed";
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  imported_order_id: string;
  created_at: string;
};

export type OrderPublicItem = {
  order_id: string;
  imported_order_id: string;
  address: string | null;
  work_scope: string | null;
  species: string | null;
  circumference: string | null;
  quantity: number | null;
};

export type OrderPhoto = {
  id: string;
  order_id: string;
  storage_path: string;
  uploaded_by: string | null;
  photo_stage: "admin" | "completion";
  created_at: string;
};
