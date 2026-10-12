import './App.css';
import { Routes, Route, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import ActivityPage from './pages/ActivityPage';
import LoginPage from './pages/LoginPage';

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

      <Routes>
        <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/activities/:activityId/edit" element={<RequireAuth><EditorPage /></RequireAuth>} />
        <Route path="/play/:activityId" element={<ActivityPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  );
}

export default App;