import { 
    parseStoredPlayer,
    serializeStoredPlayer,
    type StoredPlayer, 
} from "../utils/storedPlayer";

const KEY = "live-player";

// sessionStorage survives a refresh of this tab and is gone when the tab closes
export function loadStoredPlayer(): StoredPlayer | null {
    try {
        return parseStoredPlayer(sessionStorage.getItem(KEY));
    } catch {
        return null;
    }
}

export function saveStoredPlayer(player: StoredPlayer): void {
    try {
        sessionStorage.setItem(KEY, serializeStoredPlayer(player));
    } catch {
        // blocked or full: the player just won't recover after a refresh
    }
}

export function clearStoredPlayer(): void {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        // nothing to clear
    }
}