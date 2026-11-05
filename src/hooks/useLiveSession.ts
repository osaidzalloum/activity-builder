import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { liveSessionSchema, questionsSchema } from "../schemas";
import type { LiveSession, Question } from "../types";

export type LoadStatus = "loading" | "ready" | "not-found" | "error";

export default function useLiveSession(code: string | undefined) {
    const [session, setSession] = useState<LiveSession | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [status, setStatus] = useState<LoadStatus>("loading");

    useEffect(() => {
    let ignore = false;

    async function load() {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("code", code ?? "")
        .maybeSingle();

      if (ignore) return;
      if (error || !data) {
        if (error) console.error(error);
        setStatus(error ? "error" : "not-found");
        return;
      }

      const parsedSession = liveSessionSchema.safeParse(data);
      if (!parsedSession.success) {
        console.error(parsedSession.error.issues);
        setStatus("error");
        return;
      }

      const { data: activity, error: activityError } = await supabase
        .from("activities")
        .select("questions")
        .eq("id", parsedSession.data.activity_id)
        .maybeSingle();

      if (ignore) return;
      if (activityError || !activity) {
        console.error(activityError);
        setStatus("error");
        return;
      }

      const parsedQuestions = questionsSchema.safeParse(activity.questions);
      if (!parsedQuestions.success) {
        console.error(parsedQuestions.error.issues);
        setStatus("error");
        return;
      }

      setSession(parsedSession.data);
      setQuestions(parsedQuestions.data);
      setStatus("ready");
    }

    load();
    return () => { ignore = true; };
  }, [code]);

  // setSession is returned because the host page updates the session after each change
  return { session, questions, status };
}