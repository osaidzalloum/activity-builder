import { describe, expect, it } from "vitest";
import { summarizeSessionList } from "./summarizeSessionList";
import type { LiveSession, SessionResults } from "../types";

const emptyResults: SessionResults = { players: {}, questions: [] };

const row = (overrides: Partial<LiveSession> = {}) => ({
  id: "s1",
  code: "AAAAAA",
  created_at: "2026-11-01T10:00:00Z",
  ended_at: null as string | null,
  scoring_mode: "fixed" as const,
  results: emptyResults,
  ...overrides,
});

const answered = (choice: number, points: number) => ({ choice, points });

describe("summarizeSessionList", () => {
  it("lists the newest session first", () => {
    const list = summarizeSessionList([
      row({ id: "old", code: "OLD111", created_at: "2026-10-01T10:00:00Z" }),
      row({ id: "new", code: "NEW222", created_at: "2026-11-03T10:00:00Z" }),
      row({ id: "mid", code: "MID333", created_at: "2026-10-20T10:00:00Z" }),
    ]);

    expect(list.map((item) => item.id)).toEqual(["new", "mid", "old"]);
  });

  it("gives sessions with the same date a fixed order by code", () => {
    const list = summarizeSessionList([
      row({ id: "b", code: "BBBBBB" }),
      row({ id: "a", code: "AAAAAA" }),
    ]);

    expect(list.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("puts a session with an unreadable date last", () => {
    const list = summarizeSessionList([
      row({ id: "broken", code: "BRK111", created_at: "not a date" }),
      row({ id: "ok", code: "OKK222", created_at: "2026-10-01T10:00:00Z" }),
    ]);

    expect(list.map((item) => item.id)).toEqual(["ok", "broken"]);
  });

  it("gives two sessions with unreadable dates a fixed order by code", () => {
    const list = summarizeSessionList([
      row({ id: "b", code: "BBBBBB", created_at: "???" }),
      row({ id: "a", code: "AAAAAA", created_at: "???" }),
    ]);

    expect(list.map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("counts the players who took part, from their names and from their answers", () => {
    const list = summarizeSessionList([
      row({
        results: {
          players: { a: "Amy", b: "Bob" },
          questions: [
            {
              id: "q1",
              text: "Q",
              options: ["x", "y"],
              correctIndex: 0,
              // a third player answered but has no saved name
              answers: { a: answered(0, 1000), c: answered(1, 0) },
            },
          ],
        },
      }),
    ]);

    expect(list[0].playerCount).toBe(3);
  });

  it("counts how many questions were revealed", () => {
    const question = (id: string) => ({
      id,
      text: id,
      options: ["x", "y"],
      correctIndex: 0,
      answers: {},
    });

    const list = summarizeSessionList([
      row({ results: { players: {}, questions: [question("q1"), question("q2")] } }),
    ]);

    expect(list[0].revealedCount).toBe(2);
  });

  it("marks a running session as active and not deletable", () => {
    const [item] = summarizeSessionList([row({ ended_at: null })]);

    expect(item).toMatchObject({ status: "active", canDelete: false });
  });

  it("marks an ended session as ended and deletable", () => {
    const [item] = summarizeSessionList([row({ ended_at: "2026-11-01T11:00:00Z" })]);

    expect(item).toMatchObject({ status: "ended", canDelete: true });
  });

  it("passes the scoring mode through", () => {
    const list = summarizeSessionList([
      row({ id: "f", code: "FFFFFF", scoring_mode: "fixed" }),
      row({ id: "s", code: "SSSSSS", scoring_mode: "speed" }),
    ]);

    expect(list.find((item) => item.id === "s")?.scoringMode).toBe("speed");
    expect(list.find((item) => item.id === "f")?.scoringMode).toBe("fixed");
  });

  it("returns an empty list when there are no sessions", () => {
    expect(summarizeSessionList([])).toEqual([]);
  });

  it("does not reorder the list it was given", () => {
    const input = [
      row({ id: "old", code: "OLD111", created_at: "2026-10-01T10:00:00Z" }),
      row({ id: "new", code: "NEW222", created_at: "2026-11-03T10:00:00Z" }),
    ];

    summarizeSessionList(input);

    expect(input.map((item) => item.id)).toEqual(["old", "new"]);
  });
});