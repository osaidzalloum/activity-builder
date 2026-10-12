import { createContext } from 'react';
import type { User, AuthError } from '@supabase/supabase-js';
export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);