import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'sales' | 'doctor' | 'admin';
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
  role: 'patient' | 'sales';
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

    const profile = await getUserProfile(authData.user.id);
    return { user: authData.user, profile };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  const profile = await getUserProfile(user.id);
  return { user, profile };
}

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return data;
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

