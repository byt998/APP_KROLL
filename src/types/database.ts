export type Profile = {
  id: string;
  phone: string | null;
  auth_email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  created_at?: string;
};
