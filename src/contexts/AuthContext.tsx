import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'job_seeker' | 'freelance_hr' | 'inhouse_hr' | 'company_employee';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  full_name_en: string | null;
  phone: string | null;
  avatar_url: string | null;
  preferred_language: string;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  about_me: string | null;
  personal_tagline: string | null;
  intro_video_url: string | null;
  title: string | null;
  gender: string | null;
  is_reservist: boolean | null;
  city: string | null;
  date_of_birth: string | null;
  driver_license: boolean | null;
  first_name: string | null;
  last_name: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  cover_letter: string | null;
  available_start_date: string | null;
  desired_salary: string | null;
  work_authorized: boolean | null;
  requires_sponsorship: boolean | null;
  race_ethnicity: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: AppRole, visibleToHR?: boolean, gender?: string, referredBy?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  // Load cached role from localStorage for faster initial render
  useEffect(() => {
    const cachedRole = localStorage.getItem('plug_user_role');
    if (cachedRole && ['job_seeker', 'freelance_hr', 'inhouse_hr', 'company_employee'].includes(cachedRole)) {
      setRole(cachedRole as AppRole);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Defer profile and role fetch to avoid blocking
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
            fetchRole(currentSession.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setRoleLoading(false);
          // Clear cached role on logout
          localStorage.removeItem('plug_user_role');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
        fetchRole(existingSession.user.id);
      } else {
        setRoleLoading(false);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setProfile(data as unknown as Profile);

      // Sync Google avatar if profile has no avatar yet
      if (!data.avatar_url) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const googleAvatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture;
        if (googleAvatar) {
          await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('user_id', userId);
          setProfile({ ...(data as unknown as Profile), avatar_url: googleAvatar });
        }
      }
    }
  };

  const fetchRole = async (userId: string) => {
    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        const fetchedRole = data.role as AppRole;
        setRole(fetchedRole);
        // Cache role in localStorage for faster initial load
        localStorage.setItem('plug_user_role', fetchedRole);
      }
    } catch (err) {
      console.error('Error fetching role:', err);
    } finally {
      setRoleLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    selectedRole: AppRole,
    visibleToHR?: boolean,
    gender?: string,
    referredBy?: string,
  ): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with phone, visible_to_hr, gender, referred_by
        const profileUpdate: Record<string, unknown> = { full_name: fullName, phone };
        if (typeof visibleToHR === 'boolean') {
          profileUpdate.visible_to_hr = visibleToHR;
        }
        if (gender) {
          profileUpdate.gender = gender;
        }
        if (referredBy) {
          profileUpdate.referred_by = referredBy;
        }

        await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('user_id', data.user.id);

        // Insert role
        await supabase
          .from('user_roles')
          .insert({ user_id: data.user.id, role: selectedRole });

        setRole(selectedRole);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh profile
      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      isLoading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
