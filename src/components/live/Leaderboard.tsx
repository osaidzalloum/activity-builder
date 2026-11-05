
type LeaderboardRow = { rank: number; name: string; points: number };

function Leaderboard ({ entries }: { entries: readonly LeaderboardRow[] }) {
    return (
        <ol className="leaderboard">
            {entries.map((entry, i) => (
              <li key={i}>
                <span>{entry.rank}</span> <strong>{entry.name}</strong>{" "}
                <span className="hint">{entry.points}</span>
              </li>
            ))}
          </ol>
    );
}

export default Leaderboard;