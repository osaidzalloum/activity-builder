import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // state للإيميل، وكلمة السر، والخطأ، و submitting
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error } = await signIn(email, password);

    setSubmitting(false);
    if (error) {
      setError("الإيميل أو كلمة السر غير صحيحة.");
      return;
    }
    navigate("/");
  }

  return (
    <div className="login-page">
      <h1>تسجيل الدخول</h1>
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
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;