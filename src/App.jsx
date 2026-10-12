
import './App.css'
import BuilderPage from './pages/BuilderPage';
import PlayPage from './pages/PlayPage';
import { useState, useEffect } from 'react';
import ActivityPage from './pages/ActivityPage';
import { useAuth } from './context/AuthContext';
import { Routes, Route, NavLink } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RequireAuth from './components/RequireAuth';





const initialQuestions = [
  { id: "q1", type: "mcq", text: "ما ناتج 5 + 3؟", options: ["6", "8", "9", "7"], correctIndex: 1 },
  { id: "q2", type: "mcq", text: "ما عاصمة الأردن؟", options: ["إربد", "الزرقاء", "عمّان", "العقبة"], correctIndex: 2 },
  { id: "q3", type: "mcq", text: "كم عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correctIndex: 2 },
  { id: "q4", type: "order", text: "رتّب مراحل دورة الماء", items: ["التبخر", "التكاثف", "الهطول", "الجريان"] },
  {
    id: "q5", type: "match", text: "طابق كل دولة بعاصمتها", pairs: [
      { left: "الأردن", right: "عمّان" },
      { left: "مصر", right: "القاهرة" },
      { left: "لبنان", right: "بيروت" },
    ]
  },
];



function App() {

  const { user, signOut } = useAuth();
  const [questions, setQuestions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("questions"));
      return Array.isArray(saved)
        ? saved.map((q) => ({ type: "mcq", ...q }))
        : initialQuestions;
    } catch {
      return initialQuestions;
    }
  });

  useEffect(() => {
    localStorage.setItem("questions", JSON.stringify(questions));

  }, [questions]);

  return (
    <div dir="rtl" className="container">

      <nav className="nav">
        <NavLink to="/" end>بناء الأسئلة</NavLink >
        <NavLink to="/play">حل النشاط</NavLink>
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
        <Route
          path="/"
          element={
            <RequireAuth>
              <BuilderPage questions={questions} setQuestions={setQuestions} />
            </RequireAuth>
          }
        />
        <Route path="/play" element={<PlayPage questions={questions} />} />
        <Route path="/play/:activityId" element={<ActivityPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>

    </div>
  )

}

export default App;
