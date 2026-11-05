type Props = {
  players: readonly { id: string; name: string }[];
  // players who already answered the open question
  answeredIds: ReadonlySet<string>;
};

function PlayerList({ players, answeredIds }: Props) {
  if (players.length === 0) return <p>لسا ما حدا انضم.</p>;

  return (
    <ul>
      {players.map((p) => (
        <li key={p.id}>
          {p.name}
          {answeredIds.has(p.id) ? " ✓" : ""}
        </li>
      ))}
    </ul>
  );
}

export default PlayerList;