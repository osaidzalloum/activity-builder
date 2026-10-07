import { useState } from 'react';

function McqQuestion({ question, onAnswer }) {
  const [selected, setSelected] = useState(null);

  function handleSelect(index) {
    setSelected(index);
    onAnswer(index === question.correctIndex);
  }

  function getOptionClass(index) {
    if (selected === null) return "play-option";
    if (index === question.correctIndex) return "play-option correct";
    if (index === selected) return "play-option wrong";
    return "play-option";
  }

  return (
    <>
      <p>{question.text}</p>
      <ul className="options">
        {question.options.map((option, index) => (
          <li key={index}>
            <button
              className={getOptionClass(index)}
              onClick={() => handleSelect(index)}
              disabled={selected !== null}
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default McqQuestion;