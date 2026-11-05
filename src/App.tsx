import './App.css';
import { lazy, Suspense } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useAuth } from './context/useAuth';
import RequireAuth from './components/RequireAuth';
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LiveHostPage = lazy(() => import('./pages/LiveHostPage'));
const JoinPage = lazy(() => import('./pages/JoinPage'));
const SessionReviewPage = lazy(() => import('./pages/SessionReviewPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));

function App() {
  const { user, signOut } = useAuth();

  return (
    <div dir="rtl" className="container">
      <nav className="nav">
        {user && <NavLink to="/" end>أنشطتي</NavLink>}
        <div className="nav-user">
          {user ? (
            <>
              <span>{user.email}</span>
              <button className="btn" onClick={signOut}>خروج</button>
            </>
          ) : (
            <NavLink to="/login">تسجيل الدخول</NavLink>
          )}
        </div>
      </nav>

      <Suspense fallback={<p>جاري التحميل...</p>}>
        <Routes>
          <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/activities/:activityId/edit" element={<RequireAuth><EditorPage /></RequireAuth>} />
          <Route path="/play/:activityId" element={<ActivityPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/activities/:activityId/results" element={<RequireAuth><ResultsPage /></RequireAuth>} />
          <Route path="/live/:code" element={<RequireAuth><LiveHostPage /></RequireAuth>} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/live/:code/review" element={<RequireAuth><SessionReviewPage /></RequireAuth>} />
          <Route
            path="/activities/:activityId/sessions"
            element={<RequireAuth><SessionsPage /></RequireAuth>}
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;