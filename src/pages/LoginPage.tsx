import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { useAuth } from '../context/useAuth';

function getSignUpError(error: AuthError) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit")) return "محاولات كثيرة، حاول مرة ثانية بعد قليل.";
    if (msg.includes("already registered")) return "هذا الإيميل مسجل مسبقاً. جرّب تسجيل الدخول.";
    if (msg.includes("password")) return "كلمة السر لازم تكون 6 أحرف على الأقل.";
    return "صار خطأ أثناء إنشاء الحساب. حاول مرة ثانية.";
}

function LoginPage() {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isLogin = mode === "login";
    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        const action = isLogin ? signIn : signUp;
        const { error: authError } = await action(email, password);

        setSubmitting(false);
        if (authError) {
            console.error(authError);
            setError(isLogin ? "الإيميل أو كلمة السر غير صحيحة." : getSignUpError(authError));
            return;
        }
        navigate((location.state as { from?: string } | null)?.from ?? "/");
    }

    return (
        <div className="login-page">
            <h1>{isLogin ? "تسجيل الدخول" : "حساب جديد"}</h1>
            <form className="card form" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">الإيميل:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label htmlFor="password">كلمة السر:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                </div>
                {error && <p className="error">{error}</p>}
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? "جاري الإرسال..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
                </button>
            </form>
            <p className="hint">
                {isLogin ? "ما عندك حساب؟" : "عندك حساب؟"}{" "}
                <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                        setMode(isLogin ? "signup" : "login");
                        setError("");
                    }}
                >
                    {isLogin ? "أنشئ حساب" : "سجل دخول"}
                </button>
            </p>
        </div>
    );
}

export default LoginPage;