import { StrictMode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useHostSnapshot from "./useHostSnapshot";
import type { HostSnapshot } from "../utils/hostSnapshot";

const STORAGE_KEY = "live-session:ABC123";

// what the database knows: question 0 was revealed
const fromDatabase: HostSnapshot = {
  answers: { 0: { a: { choice: 1, receivedAt: 0 } } },
  scores: { 0: { a: 1000 } },
};

// a database copy with nothing in it, created once so its identity stays the same between renders
const nothingYet: HostSnapshot = { answers: {}, scores: {} };

beforeEach(() => localStorage.clear());

describe("useHostSnapshot: filling in what this browser lost", () => {
  it("starts from what the database knows when this browser has nothing saved", () => {
    const { result } = renderHook(() => useHostSnapshot("ABC123", fromDatabase));

    expect(result.current[0]).toEqual(fromDatabase);
  });

  it("saves the restored data in this browser too", () => {
    renderHook(() => useHostSnapshot("ABC123", fromDatabase));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(fromDatabase);
  });

  it("lets the database win for its questions and keeps the rest of this browser's data", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        // question 0 is stale here, question 1 is still open
        answers: { 0: { a: { choice: 0, receivedAt: 7 } }, 1: { b: { choice: 2, receivedAt: 9 } } },
        scores: { 0: { a: 0 } },
      })
    );

    const { result } = renderHook(() => useHostSnapshot("ABC123", fromDatabase));

    expect(result.current[0]).toEqual({
      answers: { 0: { a: { choice: 1, receivedAt: 0 } }, 1: { b: { choice: 2, receivedAt: 9 } } },
      scores: { 0: { a: 1000 } },
    });
  });

  it("does not overwrite newer data when the database copy changes later", () => {
    const { result, rerender } = renderHook(
      ({ saved }) => useHostSnapshot("ABC123", saved),
      { initialProps: { saved: fromDatabase } }
    );
    act(() =>
      result.current[1]((prev) => ({ ...prev, scores: { ...prev.scores, 1: { a: 500 } } }))
    );

    rerender({ saved: { answers: {}, scores: { 0: { a: 1 } } } });

    expect(result.current[0].scores).toEqual({ 0: { a: 1000 }, 1: { a: 500 } });
  });

  it("works under StrictMode", () => {
    const { result } = renderHook(() => useHostSnapshot("ABC123", fromDatabase), {
      wrapper: StrictMode,
    });

    expect(result.current[0]).toEqual(fromDatabase);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(fromDatabase);
  });

  it("changes nothing when the database knows nothing yet", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ answers: { 0: { a: { choice: 1, receivedAt: 3 } } }, scores: {} })
    );

    const { result } = renderHook(() => useHostSnapshot("ABC123", nothingYet));

    expect(result.current[0].answers).toEqual({ 0: { a: { choice: 1, receivedAt: 3 } } });
  });
});