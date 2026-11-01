import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";
import { liveSessionSchema } from "../schemas";
import usePresence from "../hooks/usePresence";
import type { LiveSession } from "../types";

type LoadStatus = "loading" | "ready" | "not-found" | "error";


const LiveHostPage = () => {
    const { code } = useParams<{ code: string }>();
    const { user } = useAuth();

    const [session, setSession] = useState<LiveSession | null>(null);
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
            if (error) {
                console.error(error);
                setStatus("error");
            } else if (!data) {
                setStatus("not-found");
            } else {
                const parsed = liveSessionSchema.safeParse(data);
                if (!parsed.success) {
                    console.error(parsed.error.issues);
                    setStatus("error");
                    return;
                }
                setSession(parsed.data);
                setStatus("ready");
            }
        }

        load();
        return () => { ignore = true; };
    }, [code]);

    // ما ندخل الغرفة إلا بعد ما نتأكد إنه الجلسة موجودة وإلي
    const participants = usePresence(
        status === "ready" ? code : undefined,
        user?.id,
        "Host",
        "host"
    );
    const players = participants.filter((p) => p.role === "player");

    if (status === "loading") return <p>جاري التحميل...</p>;
    if (status === "not-found") return <p>الجلسة غير موجودة.</p>;
    if (status === "error" || !session) return <p>صار خطأ أثناء تحميل الجلسة.</p>;


     return (
    <div>
      <Link to="/" className="back-link">→ أنشطتي</Link>

      <div className="card">
        <p className="hint">كود الانضمام</p>
        <h1 style={{ letterSpacing: 6 }}>{session.code}</h1>
        <p className="hint">
          الطلاب بيفتحوا <strong>{window.location.origin}/join</strong> وبيكتبوا الكود
        </p>
      </div>

      <h2>المتصلون ({players.length})</h2>
      {players.length === 0 ? (
        <p>لسا ما حدا انضم.</p>
      ) : (
        <ul>
          {players.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default LiveHostPage