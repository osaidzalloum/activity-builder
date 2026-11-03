import { useEffect, useState } from "react";
import { 
    emptySnapshot, 
    parseHostSnapshot,
    serializeHostSnapshot,
    type HostSnapshot 
} from "../utils/hostSnapshot";

const storageKey = (code: string) => `live-session:${code}`;

export default function useHostSnapshot(code: string | undefined) {
    const [snapshot, setSnapshot] = useState<HostSnapshot>(emptySnapshot);
    // state, not a ref: saving must wait for a render that already contains the restored data
    const [restoredFor, setRestoredFor] = useState<string | null>(null);

    useEffect(() => {
        if (!code) return;
        try {
            setSnapshot(parseHostSnapshot(localStorage.getItem(storageKey(code))));
        } catch {
            setSnapshot(emptySnapshot());
        }
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