import { StrictMode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useHostSnapshot from "./useHostSnapshot";

const KEY = "live-session:ABC123";
const saved = {
    answers: { 0: { a: { choice: 1, receivedAt: 1500} } },
    scores: { 0: { a: 1000 } },
};

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(KEY, JSON.stringify(saved));
});

describe("useHostSnapshot", () => {
    it("restores saved data", () => {
        const { result } = renderHook(() => useHostSnapshot("ABC123"));

        expect(result.current[0]).toEqual(saved);
    });

    it("restores saved data under StrictMode without overwriting it", () => {
        const { result } = renderHook(() => useHostSnapshot("ABC123"), { wrapper: StrictMode });

        expect(result.current[0]).toEqual(saved);
        expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(saved);
    });

    it("saves changes", () => {
        const { result } = renderHook(() => useHostSnapshot("ABC123"), { wrapper: StrictMode });

        act(() =>
            result.current[1]((prev) => ({ ...prev, scores: { ...prev.scores, 1: { a: 5 } } }))
        );

        expect(JSON.parse(localStorage.getItem(KEY)!).scores[1]).toEqual({ a: 5 });
    });

    it("writes nothing before the session code is known", () => {
        localStorage.clear();

        renderHook(() => useHostSnapshot(undefined), { wrapper: StrictMode });

        expect(localStorage.length).toBe(0);
    })
})