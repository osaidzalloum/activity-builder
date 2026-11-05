import { useState, type FormEvent } from "react";

type Props = {
    // resolves to an error message, or to null when the student has joined
    onJoin: (code: string, name: string) => Promise<string | null>;
};

function JoinForm({ onJoin }: Props) {
    const [codeInput, setCodeInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        const message = await onJoin(codeInput, nameInput);
        setSubmitting(false);
        if (message) setError(message);
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

export default JoinForm;