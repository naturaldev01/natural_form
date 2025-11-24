import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise use values from Supabase MCP
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://biholxydtpvqvlzntrdt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpaG9seHlkdHB2cXZsem50cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTM2NTMsImV4cCI6MjA3OTQ4OTY1M30.J_8-K6tnTJPdVi_yl-VrPobu2XkSrLC7v9CCACN-_Sw';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
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

