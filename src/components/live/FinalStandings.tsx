import type { FinalEvent } from "../../types";
import Leaderboard from "./Leaderboard";

type Props = {
    // this student's own total and rank, if they have one
    mine: FinalEvent["results"][string] | null;
    top: FinalEvent["top"];
    onLeave: () => void;
};

function FinalStandings({ mine, top, onLeave }: Props) {
    return (
        <div className="card">
            <h1>انتهت الجلسة 🎉</h1>
            {mine && (
                <p>
                    مجموعك <strong>{mine.total}</strong> · المرتبة <strong>{mine.rank}</strong>
                </p>
            )}
            {top.length > 0 && (
                <>
                    <h3>الأوائل</h3>
                    <Leaderboard entries={top} />
                </>
            )}
            <button className="btn" onClick={onLeave}>جلسة جديدة</button>
        </div>
    )
}

export default FinalStandings;