import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qdfewglxhqyvrmcflsdj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZmV3Z2x4aHF5dnJtY2Zsc2RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTU0MjAsImV4cCI6MjA3OTU3MTQyMH0.ZGO3m1Ppn5CcMyi_wmi8-QSa7sc8yyKGk_Hc6r2HtPU';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('API Login: Starting for', email);

    // Create a new Supabase client for this request
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('API Login: Auth result:', { user: authData?.user?.email, error: authError?.message });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'No user returned' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    console.log('API Login: Profile result:', { profile, error: profileError?.message });

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Return session and profile
    return NextResponse.json({
      session: authData.session,
      profile,
    });

  } catch (error: any) {
    console.error('API Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}

