import { createClient } from '@supabase/supabase-js';

// Environment variables - no fallbacks for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

