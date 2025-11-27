import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise use values from Supabase MCP (Customer_Form project)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fkkhddrcdwnuxuytechw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZra2hkZHJjZHdudXh1eXRlY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMjM4MDIsImV4cCI6MjA3OTc5OTgwMn0.ncrvjdmtUsW-W92t1gEA1kBkl78Au4jFnPrivIzmMhg';

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

