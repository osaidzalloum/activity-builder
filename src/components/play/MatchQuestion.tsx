import { useState } from 'react';
import shuffle from '../../utils/shuffle';
import type { MatchQuestion as MatchQuestionType, PlayProps } from '../../types';

function MatchQuestion({ question, onAnswer }: PlayProps<MatchQuestionType>) {
    const [matches, setMatches] = useState<Record<string, string>>({});
    const [activeLeft, setActiveLeft] = useState<string | null>(null);
    const [rightColumn] = useState(() => shuffle(question.pairs.map((p) => p.right)));
    const [checked, setChecked] = useState(false);

    // هل كل العناصر انربطت؟ (قيمة مشتقة، مش state)
    const allMatched = Object.keys(matches).length === question.pairs.length;

    function handleLeftClick(left: string) {
        setActiveLeft(left);
    }

    function handleRightClick(right: string) {
        if (activeLeft === null) return;
        setMatches((prev) => {
            const next: Record<string, string> = {};
            for (const [left, r] of Object.entries(prev)) {
                if (r !== right) next[left] = r;
            }
            next[activeLeft] = right;
            return next;
        });
        setActiveLeft(null);
    }

    function handleCheck() {
        setChecked(true);
        const isCorrect = question.pairs.every((pair) => matches[pair.left] === pair.right);
        onAnswer(isCorrect);
    }

    function getLeftClass(left: string) {
        if (checked) {
            const pair = question.pairs.find((p) => p.left === left);
            return matches[left] === pair?.right ? "match-item correct" : "match-item wrong";
        }
        if (activeLeft === left) return "match-item active";
        if (matches[left] !== undefined) return "match-item matched";
        return "match-item";
    }

    return (
        <>
            <p>{question.text}</p>
            <div className="match-container">

                {/* العمود الأول: div عادي، والعناصر أزرار */}
                <div className="match-column">
                    {question.pairs.map((pair) => (
                        <button
                            type="button"
                            key={pair.left}
                            className={getLeftClass(pair.left)}
                            onClick={() => handleLeftClick(pair.left)}
                            disabled={checked}
                        >
                            {pair.left}
                            {matches[pair.left] && (
                                <small className="match-choice">← {matches[pair.left]}</small>
                            )}
                        </button>
                    ))}
                </div>

                {/* العمود الثاني */}
                <div className="match-column">
                    {rightColumn.map((right) => {
                        const isUsed = Object.values(matches).includes(right);
                        return (
                            <button
                                type="button"
                                key={right}
                                className={isUsed ? "match-item matched" : "match-item"}
                                onClick={() => handleRightClick(right)}
                                // معطل إذا ما في عنصر مختار من العمود الأول، أو بعد التحقق
                                disabled={checked || activeLeft === null}
                            >
                                {right}
                            </button>
                        );
                    })}
                </div>
            </div>

            {!checked && (
                <button className="btn btn-primary" onClick={handleCheck} disabled={!allMatched}>
                    تحقق
                </button>
            )}
        </>
    );
}

export default MatchQuestion;