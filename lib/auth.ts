import { createClient } from './supabase/browser';

export type UserRole = 'sales' | 'marketing' | 'admin' | 'doctor';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
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
  role: 'sales' | 'marketing' | 'doctor';
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Timeout helper - sonsuz beklemeyi önler
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Sign up new user
export async function signUp(data: SignUpData) {
  const supabase = createClient();
  
  // Create auth user with metadata
  // A database trigger will automatically create the user_profile
  // Note: First user to register will automatically become admin
  const { data: authData, error: authError } = await withTimeout(
    supabase.auth.signUp({
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
    }),
    15000,
    'Registration timed out. Please try again.'
  );

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  // Wait a moment for the trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 1500));

  return authData;
}

// Sign in existing user
export async function signIn(data: SignInData) {
  const supabase = createClient();
  
  const { data: authData, error: authError } = await withTimeout(
    supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    }),
    15000,
    'Login timed out. Please check your connection and try again.'
  );

  if (authError) {
    throw authError;
  }

  if (!authData.user) {
    throw new Error('No user returned from sign in');
  }

  // Kısa bir bekleme - session'ın yerleşmesi için
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Profile'ı çek
  const profile = await getUserProfile(authData.user.id);
  
  return { user: authData.user, profile };
}

// Sign out
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current user - simplified with fail-fast
export async function getCurrentUser() {
  const supabase = createClient();
  
  try {
    const { data: { user }, error } = await withTimeout(
      supabase.auth.getUser(),
      10000,
      'Session check timed out'
    );
    
    if (error || !user) {
      return null;
    }
    
    const profile = await getUserProfile(user.id);
    return { user, profile };
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

// Get user profile - with timeout and minimal select
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  
  try {
    const result = await withTimeout<{ data: UserProfile | null; error: any }>(
      (supabase
        .from('user_profiles') as any)
        .select('id, email, first_name, last_name, role, phone, is_approved, created_at, updated_at')
        .eq('id', userId)
        .single(),
      8000,
      'Profile fetch timed out'
    );
    
    if (result.error) {
      console.error('getUserProfile error:', result.error.message);
      return null;
    }

    return result.data;
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

// Listen to auth state changes - with error handling
export function onAuthStateChange(callback: (user: any, profile: UserProfile | null) => void) {
  const supabase = createClient();
  
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      callback(null, null);
      return;
    }
    
    if (session?.user) {
      try {
        const profile = await getUserProfile(session.user.id);
        callback(session.user, profile);
      } catch {
        callback(session.user, null);
      }
    } else {
      callback(null, null);
    }
  });
}
