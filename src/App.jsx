
import './App.css'
import BuilderPage from './pages/BuilderPage';
import PlayPage from './pages/PlayPage';
import { useState, useEffect } from 'react';


import { Routes, Route, NavLink } from 'react-router-dom';
const initialQuestions = [
  { id: "q1", type: "mcq", text: "ما ناتج 5 + 3؟", options: ["6", "8", "9", "7"], correctIndex: 1 },
  { id: "q2", type: "mcq", text: "ما عاصمة الأردن؟", options: ["إربد", "الزرقاء", "عمّان", "العقبة"], correctIndex: 2 },
  { id: "q3", type: "mcq", text: "كم عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correctIndex: 2 },
];



function App() {
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
      </nav>

      <Routes>
        <Route path="/" element={<BuilderPage questions={questions} setQuestions={setQuestions} />} />
        <Route path="/play" element={<PlayPage questions={questions} />} />
      </Routes>
    </div>
  )

}

export default App;
