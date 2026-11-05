type Props = {
    players: readonly { id: string; name: string } [];
    // players who already answered the open question
    answerdIds: ReadonlySet<string>;
};

function PlayerList({ players, answerdIds }: Props) {
    if (players.length === 0) return <p>حتى الآن، لم ينضم أي شخص.</p>;

    return (
        <ul>
          {players.map((p) => (
            <li key={p.id}>
              {p.name}
              {answerdIds.has(p.id) ? " ✓" : ""}
            </li>
          ))}
        </ul>
    );
}

export default PlayerList