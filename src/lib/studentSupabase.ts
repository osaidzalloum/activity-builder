import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// The key includes the project, so a session that belongs to another project (for example when
// the app is pointed at a different one while a tab is still open) is never reused: its token
// would be signed by a key that this project does not know.
function storageKeyFor(url: string): string {
  try {
    return `sb-${new URL(url).hostname.split(".")[0]}-student-auth`;
  } catch {
    return "sb-student-auth";
  }
}

// Students have no account, so each one gets an anonymous identity (the private channels need one).
// It lives in sessionStorage: it survives a refresh of the tab and disappears when the tab closes,
// so two students on one device are two identities, and a shared device does not leak one.
// A separate storage key keeps it apart from the teacher's session.
// Created on first use, so the pages that never need it do not pay for it.
export function getStudentClient(): SupabaseClient {
  const url: string = import.meta.env.VITE_SUPABASE_URL;
  client ??= createClient(url, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: sessionStorage,
      storageKey: storageKeyFor(url),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}