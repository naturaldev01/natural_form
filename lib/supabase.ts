import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise use values from Supabase MCP
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdfewglxhqyvrmcflsdj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZmV3Z2x4aHF5dnJtY2Zsc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU0MjAsImV4cCI6MjA3OTU3MTQyMH0.ZGO3m1Ppn5CcMyi_wmi8-QSa7sc8yyKGk_Hc6r2HtPU';

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

