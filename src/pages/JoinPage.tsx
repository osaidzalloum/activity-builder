import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import {
    joinedSessionsSchema,
    participantSchema,
    questionEventSchema,
} from "../schemas";
import useLiveChannel from "../hooks/useLiveChannel";
import type { QuestionEvent } from "../types";

type Joined = { code: string, name: string }

const JoinPage = () => {
    // هوية الطالب بهالتبويب: بتتولد مرة وحدة
    const [playerId] = useState(() => crypto.randomUUID());
    const [codeInput, setCodeInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [joined, setJoined] = useState<Joined | null>(null);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [current, setCurrent] = useState<QuestionEvent | null>(null);

    function handleBroadcast(event: string, payload: unknown) {
        if (event !== "question") return;
        // data from the channel is untrusted: validate before using it
        const parsed = questionEventSchema.safeParse(payload);
        if (!parsed.success) {
            console.error(parsed.error.issues);
            return;
        }
        setCurrent(parsed.data);
    }
    const { participants } = useLiveChannel(
        joined?.code,
        playerId,
        joined?.name,
        "player",
        handleBroadcast
    );
    const players = participants.filter((p) => p.role === "player");
    const hostConnected = participants.some((p) => p.role === "host");

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        // نفس تنظيف الدالة بقاعدة البيانات، والكود دايماً بأحرف كبيرة
        const code = codeInput.trim().toUpperCase();
        // نعيد استخدام قاعدة الاسم من الـ schema بدل ما نكتبها مرة ثانية
        const nameResult = participantSchema.shape.name.safeParse(nameInput);

        if (code.length !== 6) {
            setError("الكود لازم يكون 6 خانات.");
            return;
        }
        if (!nameResult.success) {
            setError(" الاسم لازم يكون بين 1 و 50 خانة.");
            return;
        }

        setSubmitting(true);
        const { data, error: rpcError } = await supabase.rpc("join_session", {
            p_code: code,
        });
        setSubmitting(false);
        if (rpcError) {
            console.error(rpcError);
            setError("صار خطأ، حاول مرة ثانية.");
            return;
        }
        // join_session بترجع مصفوفة (returns table)

        const parsed = joinedSessionsSchema.safeParse(data);
        if (!parsed.success) {
            console.error(parsed.error.issues);
            setError("صار خطأ، حاول مرة ثانية.");
            return;
        }
        if (parsed.data.length === 0) {
            setError("الكود غير صحيح، أو الجلسة انتهت.");
            return;
        }

        setJoined({ code, name: nameResult.data });
    }

    if (joined) {
        return (
            <div>
                {current ? (
                    <div className="card">
                        <p className="hint">
                            السؤال {current.index + 1} من {current.total}
                        </p>
                        <h2>{current.question.text}</h2>
                        <ul className="options">
                            {current.question.options.map((option, i) => (
                                <li key={i}>{option}</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="card">
                        <h1>أهلاً {joined.name} 👋</h1>
                        <p>
                            {hostConnected
                                ? "بانتظار المعلم يبدأ الأسئلة..."
                                : "بانتظار المعلم يفتح الجلسة..."}
                        </p>
                    </div>
                )}

                <h2>المتصلون ({players.length})</h2>
                <ul>
                    {players.map((p) => (
                        <li key={p.id}>{p.name}</li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <form className="card form" onSubmit={handleSubmit}>
            <h1>انضم لجلسة</h1>

            <div>
                <label htmlFor="code">كود الجلسة</label>
                <input
                    id="code"
                    dir="ltr"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    maxLength={6}
                    autoComplete="off"
                    style={{ textTransform: "uppercase", letterSpacing: 4 }}
                />
            </div>

            <div>
                <label htmlFor="name">اسمك</label>
                <input
                    id="name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={50}
                    autoComplete="off"
                />
            </div>

            {error && <p className="error">{error}</p>}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "جاري الانضمام..." : "انضم"}
            </button>
        </form>
    );
}
export default JoinPage