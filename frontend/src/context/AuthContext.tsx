import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'Citizen' | 'Officer' | 'MP' | 'Admin';
  selectedState?: string;
  selectedConstituency?: string;
  selectedLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setMockUserAndProfile: (
    email: string, 
    role: 'Citizen' | 'Officer' | 'MP' | 'Admin',
    name?: string,
    state?: string,
    constituency?: string,
    language?: string
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Check for saved mock session in localStorage to survive page refreshes
    const saved = localStorage.getItem('jansetu_mock_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed.user);
        setProfile(parsed.profile);
        setSession(parsed.session);
        setLoading(false);
        return;
      } catch (err) {
        console.warn("Could not load parsed auth state", err);
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setLoading(true);
        await fetchProfile(session.user.id);
        setLoading(false);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setMockUserAndProfile = (
    email: string, 
    role: 'Citizen' | 'Officer' | 'MP' | 'Admin',
    name?: string,
    state?: string,
    constituency?: string,
    language?: string
  ) => {
    setLoading(true);
    const mockUser = {
      id: `mock-user-${role.toLowerCase()}`,
      email: email,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: { full_name: name || `Demo ${role}`, role: role },
      created_at: new Date().toISOString()
    } as User;
    
    const mockProfile: Profile = {
      id: mockUser.id,
      email: email,
      full_name: name || `Demo ${role}`,
      role: role,
      selectedState: state || "Andhra Pradesh",
      selectedConstituency: constituency || "Guntur Lok Sabha",
      selectedLanguage: language || "EN"
    };

    setUser(mockUser);
    setProfile(mockProfile);
    const mockSession = {} as Session;
    setSession(mockSession);
    
    localStorage.setItem('jansetu_mock_auth', JSON.stringify({
      user: mockUser,
      profile: mockProfile,
      session: mockSession
    }));
    
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    localStorage.removeItem('jansetu_mock_auth');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Could not log out from Supabase (offline mode active)");
    }
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile, setMockUserAndProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
