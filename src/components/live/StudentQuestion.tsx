import { QuestionEvent, RevealEvent } from "../../types";
import Leaderboard from "./Leaderboard";

type PlayerResult = RevealEvent["results"][string];

type Props = {
    current: QuestionEvent;
    // the option this student chose for this question, if any
    selected: number | null;
    // the reveal of this question, once the teacher has shown the answer
    reveal: RevealEvent | null;
    myResult: PlayerResult | null;
    answerError: string;
    onChoose: (choice: number) => void;
};

function StudentQuestion({ current, selected, reveal, myResult, answerError, onChoose }: Props) {
    return (
        <div className="card play-container">
            <p className="hint">
                السؤال {current.index + 1} من {current.total}
            </p>
            <h2>{current.question.text}</h2>
            {current.scoring === "speed" && !reveal && (
                <p className="hint">⚡ كلما جاوبت أسرع، كسبت نقاط أكثر</p>
            )}
            <ul className="options">
                {current.question.options.map((option, i) => {
                    let className = "play-option";
                    if (reveal) {
                        if (i === reveal.correctIndex) className += " correct";
                        else if (i === selected) className += " wrong";
                    } else if (i === selected) {
                        className += " active";
                    }
                    return (
                        <li key={i}>
                            <button
                                className={className}
                                onClick={() => onChoose(i)}
                                disabled={selected !== null || reveal !== null}
                            >
                                {option}
                            </button>
                        </li>
                    );
                })}
            </ul>

            {answerError && <p className="error">{answerError}</p>}
            {!reveal && selected !== null && <p className="hint">وصل جوابك، بانتظار المعلم...</p>}
            {reveal && (
                <p>
                    {selected === null
                        ? "ما جاوبت على هذا السؤال."
                        : selected === reveal.correctIndex
                            ? "✅ إجابة صحيحة"
                            : "❌ إجابة خاطئة"}
                </p>
            )}

            {myResult && (
                <p>
                    <strong>+{myResult.gained}</strong> نقطة · المجموع{" "}
                    <strong>{myResult.total}</strong> · المرتبة <strong>{myResult.rank}</strong>
                </p>
            )}

            {reveal && reveal.top.length > 0 && (
                <>
                    <h3>الأوائل</h3>
                    <Leaderboard entries={reveal.top} />
                </>
            )}
        </div>
    );
}

export default StudentQuestion;