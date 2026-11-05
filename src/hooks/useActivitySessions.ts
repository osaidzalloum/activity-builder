import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { sessionRowsSchema } from "../schemas";
import { summarizeSessionList } from "../utils/summarizeSessionList";
import type { LoadStatus } from "./useLiveSession";
import type { SessionRow } from "../types";

// The past live sessions of one activity, and deleting an ended one.
export default function useActivitySessions(activityId: string | undefined) {
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      // RLS returns only the sessions of the logged-in teacher
      const [activityRes, sessionsRes] = await Promise.all([
        supabase.from("activities").select("title").eq("id", activityId ?? "").maybeSingle(),
        supabase
          .from("live_sessions")
          .select("id, code, created_at, ended_at, scoring_mode, results")
          .eq("activity_id", activityId ?? ""),
      ]);

      if (ignore) return;
      if (activityRes.error || sessionsRes.error) {
        console.error(activityRes.error ?? sessionsRes.error);
        setStatus("error");
        return;
      }
      if (!activityRes.data) {
        setStatus("not-found");
        return;
      }

      const parsed = sessionRowsSchema.safeParse(sessionsRes.data);
      if (!parsed.success) {
        console.error(parsed.error.issues);
        setStatus("error");
        return;
      }

      setTitle(activityRes.data.title);
      setRows(parsed.data);
      setStatus("ready");
    }

    load();
    return () => { ignore = true; };
  }, [activityId]);

  // derived: the list is rebuilt whenever the rows change
  const items = useMemo(() => summarizeSessionList(rows), [rows]);

  async function deleteSession(id: string) {
    // only an ended session can be deleted (the database enforces it too)
    if (!items.find((item) => item.id === id)?.canDelete) return;

    setDeletingId(id);
    setDeleteError("");

    const { data, error } = await supabase.from("live_sessions").delete().eq("id", id).select("id");
    setDeletingId(null);

    if (error) {
      console.error(error);
      setDeleteError("ما قدرنا نحذف الجلسة.");
      return;
    }
    // a blocked delete returns no error, only zero rows
    if (!data || data.length === 0) {
      console.error("Delete removed 0 rows: blocked by RLS");
      setDeleteError("ما انحذفت الجلسة: ما في صلاحية للحذف.");
      return;
    }

    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  return { title, items, status, deletingId, deleteError, deleteSession };
}