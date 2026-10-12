import { useState } from 'react';
import type { McqQuestion as McqQuestionType, PlayProps } from '../../types';

function McqQuestion({ question, onAnswer }: PlayProps<McqQuestionType>) {
  const [selected, setSelected] = useState<number | null>(null);  

  function handleSelect(index: number) {
    setSelected(index);
    onAnswer(index === question.correctIndex);
  }

  function getOptionClass(index: number) {
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