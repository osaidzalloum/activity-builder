import { supabase } from "./supabase";
import { joinedSessionsSchema } from "../schemas";

export type SessionCheck = "active" | "not-found" | "error";

// join_session returns an array: empty means a wrong code or an ended session
export async function checkSession(code: string): Promise<SessionCheck> {
  const { data, error } = await supabase.rpc("join_session", { p_code: code });

  if (error) {
    console.error(error);
    return "error";
  }

  const parsed = joinedSessionsSchema.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error.issues);
    return "error";
  }

  return parsed.data.length > 0 ? "active" : "not-found";
}