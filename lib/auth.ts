import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'sales' | 'marketing' | 'admin';
  phone?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'sales' | 'marketing';
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Sign up new user
export async function signUp(data: SignUpData) {
  // Create auth user with metadata
  // A database trigger will automatically create the user_profile
  // Note: First user to register will automatically become admin
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        role: data.role,
        phone: data.phone || null,
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // Wait a moment for the trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 1500));

  return authData;
}

// Sign in existing user
export async function signIn(data: SignInData) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No user returned from sign in');
    }

    // Wait a moment for the session to be properly set before querying profile
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to get profile, with retry
    let profile = await getUserProfile(authData.user.id);
    
    // If profile not found, wait and retry once more (RLS might need session to propagate)
    if (!profile) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      profile = await getUserProfile(authData.user.id);
    }
    
    return { user: authData.user, profile };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user - simplified without custom timeout
// Supabase has its own timeout settings
export async function getCurrentUser() {
  console.log('[DEBUG] getCurrentUser called');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('[DEBUG] getUser response - user:', user?.id, 'error:', error);
    
    if (error || !user) {
      console.log('[DEBUG] No user found or error');
      return null;
    }
    
    const profile = await getUserProfile(user.id);
    console.log('[DEBUG] getCurrentUser complete - profile:', profile?.email);
    return { user, profile };
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

// Get user profile - simplified without custom timeout
// Supabase has its own timeout (60s for authenticated users)
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  console.log('[DEBUG] getUserProfile called for userId:', userId);
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('[DEBUG] getUserProfile response - data:', data, 'error:', error);
    
    if (error) {
      console.error('getUserProfile error:', error.message, 'code:', error.code, 'userId:', userId);
      return null;
    }

    return data;
  } catch (err) {
    console.error('getUserProfile exception:', err);
    return null;
  }
}

// Check if user has required role
export function hasRole(profile: UserProfile | null, allowedRoles: string[]): boolean {
  if (!profile) return false;
  return allowedRoles.includes(profile.role);
}

// Check if user is approved
export function isApproved(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.is_approved;
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: any, profile: UserProfile | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getUserProfile(session.user.id);
      callback(session.user, profile);
    } else {
      callback(null, null);
    }
  });
}

