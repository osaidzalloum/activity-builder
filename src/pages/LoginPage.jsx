import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();
    
    // state للإيميل، وكلمة السر، والخطأ، و submitting
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("login");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const isLogin = mode === "login";
    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        const action = isLogin ? signIn : signUp;
        const { error } = await action(email, password);

        setSubmitting(false);
        if (error) {
            setError(isLogin ? "الإيميل أو كلمة السر غير صحيحة." : error.message);
            return;
        }
        navigate("/");


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