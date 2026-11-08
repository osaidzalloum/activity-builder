import { useEffect, useRef, useState } from "react";
import {
    emptySnapshot,
    parseHostSnapshot,
    serializeHostSnapshot,
    type HostSnapshot
} from "../utils/hostSnapshot";
import { mergeSnapshots } from "../utils/restoreSnapshot";

const storageKey = (code: string) => `live-session:${code}`;

// `saved` is what the database already knows (the revealed questions).
// It only matters at the moment of restoring, to fill in what this browser has lost.
export default function useHostSnapshot(code: string | undefined, saved?: HostSnapshot) {
    const [snapshot, setSnapshot] = useState<HostSnapshot>(emptySnapshot);
    // state, not a ref: saving must wait for a render that already contains the restored data
    const [restoredFor, setRestoredFor] = useState<string | null>(null);

    // a ref, so a later change of `saved` never restarts the restore and overwrites newer answers
    const savedRef = useRef(saved);
    useEffect(() => {
        savedRef.current = saved;
    }, [saved]);

    useEffect(() => {
        if (!code) return;

        let local = emptySnapshot();
        try {
            local = parseHostSnapshot(localStorage.getItem(storageKey(code)));
        } catch {
            // storage can be blocked: start from what the database knows
        }
        setSnapshot(savedRef.current ? mergeSnapshots(local, savedRef.current) : local);
        setRestoredFor(code);
    }, [code]);

    useEffect(() => {
        if (!code || restoredFor !== code) return;
        try {
            localStorage.setItem(storageKey(code), serializeHostSnapshot(snapshot));
        } catch {
            // storage can be full or blocked: the session still works, it just won't survive a refresh
        }
    }, [code, restoredFor, snapshot]);

    return [snapshot, setSnapshot] as const;
}