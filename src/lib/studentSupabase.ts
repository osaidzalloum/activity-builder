import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client : SupabaseClient | null = null;

// Students have no account, so each one gets an anonymous identity (the private channels need one).
// It lives in sessionStorage: it survives a refresh of the tab and disappears when the tab closes,
// so two students on one device are two identities, and a shared device does not leak one.
// A separate storage key keeps it apart from the teacher's session.
// Created on first use, so the pages that never need it do not pay for it.
export function getStudentClient(): SupabaseClient {
    client ??= createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                storage: sessionStorage,
                storageKey: "sb-student-auth",
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
      },
    }
  );
  return client;
}