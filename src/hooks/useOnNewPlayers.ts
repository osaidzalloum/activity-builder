import { useEffect, useRef } from "react";

// Calls onNew (debounced) when a player id appears that was not there before.
// A player who leaves and comes back, for example after a refresh, counts as new again.
export default function useOnNewPlayers(
  playerIds: readonly string[],
  onNew: () => void,
  delayMs = 300
) {
  const known = useRef<Set<string>>(new Set());
  const pending = useRef(false);
  const callback = useRef(onNew);

  // keep the latest callback without restarting the timer
  useEffect(() => {
    callback.current = onNew;
  }, [onNew]);

  // a string key: the effect runs when the ids change, not on every render
  const key = JSON.stringify([...playerIds].sort());

  useEffect(() => {
    const ids: string[] = JSON.parse(key);
    const fresh = ids.filter((id) => !known.current.has(id));
    known.current = new Set(ids);

    if (fresh.length > 0) pending.current = true;
    if (!pending.current) return;

    const timer = setTimeout(() => {
      pending.current = false;
      callback.current();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [key, delayMs]);
}