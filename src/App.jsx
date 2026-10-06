
import './App.css'
import BuilderPage from './pages/BuilderPage';
import PlayPage from './pages/PlayPage';
import { useState,useEffect } from 'react';


import { Routes, Route, Link } from 'react-router-dom';
const initialQuestions = [
  { id: "q1", text: "ما ناتج 5 + 3؟", options: ["6", "8", "9", "7"], correctIndex: 1 },
  { id: "q2", text: "ما عاصمة الأردن؟", options: ["إربد", "الزرقاء", "عمّان", "العقبة"], correctIndex: 2 },
  { id: "q3", text: "كم عدد أيام الأسبوع؟", options: ["5", "6", "7", "8"], correctIndex: 2 },
];



function App() {
  const [questions, setQuestions] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("questions"));
    return Array.isArray(saved) ? saved : initialQuestions;
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
      <Link to="/">بناء الأسئلة</Link>
      <Link to="/play">حل النشاط</Link>
    </nav>

    <Routes>
      <Route path="/" element={<BuilderPage questions={questions} setQuestions={setQuestions} />} />
      <Route path="/play" element={<PlayPage questions={questions} />} />
    </Routes>
  </div>
   )

}

export default App;
