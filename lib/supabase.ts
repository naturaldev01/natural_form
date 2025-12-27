// Re-export from new location for backward compatibility
export { createClient, supabase } from './supabase/browser';

export interface Consultation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  treatment_type: 'teeth' | 'hair';
  original_image_url: string;
  transformed_image_url: string | null;
  created_at: string;
}
