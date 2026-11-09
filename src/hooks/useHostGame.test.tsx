import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { LiveSession, Question } from "../types";

type Reply = { data: unknown; error: unknown };
type Update = { changes: Record<string, unknown>; filters: [string, unknown][] };

// shared with the mocks below, which vitest moves to the top of the file
const h = vi.hoisted(() => ({
  order: [] as string[],
  updates: [] as Update[],
  reply: { data: [{ id: "s1" }], error: null } as Reply,
  queue: [] as Reply[],
  participants: [] as unknown[],
  send: vi.fn(),
  onBroadcast: undefined as ((event: string, payload: unknown) => void) | undefined,
}));

// the database: records every update and its filters, and answers with a canned reply
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => {
      const record: Update = { changes: {}, filters: [] };
      const b: Record<string, unknown> = {};
      b.update = (changes: Record<string, unknown>) => {
        record.changes = changes;
        h.updates.push(record);
        return b;
      };
      b.eq = (column: string, value: unknown) => {
        record.filters.push([column, value]);
        return b;
      };
      b.is = (column: string, value: unknown) => {
        record.filters.push([column, value]);
        return b;
      };
      b.select = () => b;
      b.then = (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) => {
        h.order.push("db");
        return Promise.resolve(h.queue.shift() ?? h.reply).then(resolve, reject);
      };
      return b;
    },
  },
}));

// the realtime channel: the test decides who is connected and what arrives
vi.mock("./useLiveChannel", () => ({
  default: (
    _code: unknown,
    _id: unknown,
    _name: unknown,
    _role: unknown,
    onBroadcast: (event: string, payload: unknown) => void
  ) => {
    h.onBroadcast = onBroadcast;
    return { participants: h.participants, send: h.send };
  },
}));

vi.mock("../context/useAuth", () => ({ useAuth: () => ({ user: { id: "teacher-1" } }) }));

import useHostGame from "./useHostGame";

const questions: Question[] = [
  { id: "q1", type: "mcq", text: "Q1", options: ["a", "b", "c"], correctIndex: 1 },
  { id: "q2", type: "mcq", text: "Q2", options: ["x", "y"], correctIndex: 0 },
  { id: "q3", type: "order", text: "Order", items: ["1", "2"] },
];

const lobby: LiveSession = {
  id: "s1",
  activity_id: "a1",
  host_id: "teacher-1",
  code: "ABC123",
  state: { status: "lobby" },
  scoring_mode: "fixed",
  results: { players: {}, questions: [] },
  created_at: "2026-11-05T10:00:00Z",
  ended_at: null,
};

const player = (id: string, name: string) => ({ id, name, role: "player" as const });
const answer = (playerId: string, choice: number, index = 0) => ({ playerId, index, choice });
const zeroRows: Reply = { data: [], error: null };

function setup(session: LiveSession = lobby) {
  return renderHook(() => useHostGame(session, questions));
}

type Hook = ReturnType<typeof setup>["result"];

// lets the awaited database call and the broadcast finish
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
const receive = (event: string, payload: unknown) => act(() => h.onBroadcast!(event, payload));

async function startQuestion(result: Hook) {
  act(() => result.current.handleNext());
  await settle();
}

async function reveal(result: Hook) {
  act(() => { void result.current.handleReveal(); });
  await settle();
}

const lastUpdate = () => h.updates[h.updates.length - 1];
const sentEvents = () => h.send.mock.calls.map(([event]) => event);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  h.order.length = 0;
  h.updates.length = 0;
  h.queue.length = 0;
  h.reply = { data: [{ id: "s1" }], error: null };
  h.participants = [];
  h.onBroadcast = undefined;
  h.send.mockReset();
  h.send.mockImplementation(async () => {
    h.order.push("send");
    return true;
  });
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useHostGame: the start", () => {
  it("starts in the lobby and counts only the multiple choice questions", () => {
    const { result } = setup();

    expect(result.current.isLobby).toBe(true);
    expect(result.current.current).toBeNull();
    expect(result.current.totalQuestions).toBe(2);
    expect(result.current.skipped).toBe(1);
  });

  it("opens the first question: saves the state, then tells the students, in that order", async () => {
    const { result } = setup();

    await startQuestion(result);

    expect(lastUpdate().changes.state).toMatchObject({ status: "question", index: 0 });
    expect(h.order).toEqual(["db", "send"]);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.current?.text).toBe("Q1");
  });

  it("never puts the correct answer in the question it sends", async () => {
    const { result } = setup();

    await startQuestion(result);

    const [event, payload] = h.send.mock.calls[0];
    expect(event).toBe("question");
    expect(payload).toMatchObject({ index: 0, total: 2, scoring: "fixed" });
    expect(JSON.stringify(payload)).not.toContain("correctIndex");
  });

  it("does not tell the students when the database refuses the change", async () => {
    h.reply = zeroRows;
    const { result } = setup();

    await startQuestion(result);

    expect(h.send).not.toHaveBeenCalled();
    expect(result.current.isLobby).toBe(true);
    expect(result.current.actionError).not.toBe("");
  });

  it("does not tell the students when the database fails", async () => {
    h.reply = { data: null, error: { message: "boom" } };
    const { result } = setup();

    await startQuestion(result);

    expect(h.send).not.toHaveBeenCalled();
    expect(result.current.actionError).toContain("boom");
  });

  it("does nothing after the last question", async () => {
    const { result } = setup();
    await startQuestion(result);
    await reveal(result);
    await startQuestion(result);
    await reveal(result);
    expect(result.current.hasMore).toBe(false);
    const updatesBefore = h.updates.length;

    await startQuestion(result);

    expect(h.updates.length).toBe(updatesBefore);
  });
});

describe("useHostGame: answers", () => {
  it("shows who answered and how many chose each option", async () => {
    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    const { result } = setup();
    await startQuestion(result);

    await receive("answer", answer("p1", 1));
    await receive("answer", answer("p2", 2));

    expect(result.current.answeredCount).toBe(2);
    expect(result.current.answeredIds.has("p1")).toBe(true);
    expect(result.current.countFor(1)).toBe(1);
    expect(result.current.countFor(2)).toBe(1);
  });

  it("keeps the first answer of a player", async () => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup();
    await startQuestion(result);

    await receive("answer", answer("p1", 0));
    await receive("answer", answer("p1", 1));

    expect(result.current.countFor(0)).toBe(1);
    expect(result.current.countFor(1)).toBe(0);
  });

  it("keeps both answers when two arrive together", async () => {
    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    const { result } = setup();
    await startQuestion(result);

    act(() => {
      h.onBroadcast!("answer", answer("p1", 1));
      h.onBroadcast!("answer", answer("p2", 1));
    });

    expect(result.current.answeredCount).toBe(2);
  });

  it("ignores an answer while no question is open", async () => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup();

    await receive("answer", answer("p1", 1));

    expect(result.current.answeredCount).toBe(0);
  });

  it("ignores an answer meant for another question", async () => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup();
    await startQuestion(result);

    await receive("answer", answer("p1", 1, 5));

    expect(result.current.answeredCount).toBe(0);
  });

  it.each([
    ["a payload that is not an object", "oops"],
    ["a missing choice", { playerId: "p1", index: 0 }],
    ["a choice far outside the options", { playerId: "p1", index: 0, choice: 99 }],
    ["a negative choice", { playerId: "p1", index: 0, choice: -1 }],
  ])("ignores %s", async (_label, payload) => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup();
    await startQuestion(result);

    await receive("answer", payload);

    expect(result.current.answeredCount).toBe(0);
  });

  it("ignores events that are not answers", async () => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup();
    await startQuestion(result);

    await receive("question", answer("p1", 1));

    expect(result.current.answeredCount).toBe(0);
  });

  it("only counts answers from players who are connected", async () => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup();
    await startQuestion(result);

    await receive("answer", answer("ghost", 1));

    expect(result.current.answeredCount).toBe(0);
  });
});

describe("useHostGame: the reveal", () => {
  async function twoPlayersAnswered() {
    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    const view = setup();
    await startQuestion(view.result);
    await receive("answer", answer("p1", 1));
    await receive("answer", answer("p2", 0));
    return view;
  }

  it("scores the answers and saves the state and the results in one request", async () => {
    const { result } = await twoPlayersAnswered();

    await reveal(result);

    const { changes, filters } = lastUpdate();
    expect(changes.state).toMatchObject({ status: "reveal", index: 0 });
    expect(changes.results).toMatchObject({
      players: { p1: "Amy", p2: "Bob" },
      questions: [
        { id: "q1", correctIndex: 1, answers: { p1: { choice: 1, points: 1000 }, p2: { choice: 0, points: 0 } } },
      ],
    });
    // the move only happens while the question is still open
    expect(filters).toContainEqual(["state->>status", "question"]);
  });

  it("tells each student the correct answer and their own result, after saving", async () => {
    const { result } = await twoPlayersAnswered();
    h.send.mockClear();
    h.order.length = 0;

    await reveal(result);

    const [event, payload] = h.send.mock.calls[0];
    expect(event).toBe("reveal");
    expect(payload).toMatchObject({
      index: 0,
      correctIndex: 1,
      results: { p1: { gained: 1000, total: 1000, rank: 1 }, p2: { gained: 0, total: 0, rank: 2 } },
    });
    expect(h.order).toEqual(["db", "send"]);
  });

  it("only names the top players, never their ids", async () => {
    const { result } = await twoPlayersAnswered();
    h.send.mockClear();

    await reveal(result);

    const [, payload] = h.send.mock.calls[0];
    expect(payload.top.map((entry: object) => Object.keys(entry).sort())).toEqual([
      ["name", "points", "rank"],
      ["name", "points", "rank"],
    ]);
  });

  it("ranks the players and keeps the totals", async () => {
    const { result } = await twoPlayersAnswered();

    await reveal(result);

    expect(result.current.isRevealed).toBe(true);
    expect(result.current.hasScores).toBe(true);
    expect(result.current.board.map((e) => [e.name, e.points, e.rank])).toEqual([
      ["Amy", 1000, 1],
      ["Bob", 0, 2],
    ]);
  });

  it("does not score a question twice, even when the reveal runs twice", async () => {
    const { result } = await twoPlayersAnswered();

    act(() => {
      void result.current.handleReveal();
      void result.current.handleReveal();
    });
    await settle();

    expect(result.current.board[0].points).toBe(1000);
  });

  it("does not tell the students or add points when the database already moved on", async () => {
    const { result } = await twoPlayersAnswered();
    h.send.mockClear();
    h.queue.push(zeroRows);

    await reveal(result);

    expect(h.send).not.toHaveBeenCalled();
    expect(result.current.hasScores).toBe(false);
    expect(result.current.isOpen).toBe(true);
  });

  it("sends the reveal only once when the second click is refused by the database", async () => {
    const { result } = await twoPlayersAnswered();
    h.send.mockClear();
    h.queue.push({ data: [{ id: "s1" }], error: null }, zeroRows);

    act(() => {
      void result.current.handleReveal();
      void result.current.handleReveal();
    });
    await settle();

    expect(sentEvents().filter((event) => event === "reveal")).toHaveLength(1);
    expect(result.current.board[0].points).toBe(1000);
  });

  it("does nothing when no question is open", async () => {
    const { result } = setup();

    await reveal(result);

    expect(h.updates).toHaveLength(0);
  });
});

describe("useHostGame: scoring mode", () => {
  it("changes the mode in the lobby and uses it for the next question", async () => {
    const { result } = setup();

    act(() => { void result.current.handleScoringChange("speed"); });
    await settle();
    await startQuestion(result);

    expect(h.updates[0].changes).toEqual({ scoring_mode: "speed" });
    expect(h.updates[0].filters).toContainEqual(["state->>status", "lobby"]);
    expect(result.current.scoringMode).toBe("speed");
    expect(h.send.mock.calls[0][1]).toMatchObject({ scoring: "speed" });
  });

  it("keeps the old mode when the database refuses the change", async () => {
    h.reply = zeroRows;
    const { result } = setup();

    act(() => { void result.current.handleScoringChange("speed"); });
    await settle();

    expect(result.current.scoringMode).toBe("fixed");
    expect(result.current.actionError).not.toBe("");
  });

  it("does not change once the questions have started", async () => {
    const { result } = setup();
    await startQuestion(result);
    const updatesBefore = h.updates.length;

    act(() => { void result.current.handleScoringChange("speed"); });
    await settle();

    expect(h.updates.length).toBe(updatesBefore);
    expect(result.current.scoringMode).toBe("fixed");
  });
});

describe("useHostGame: the end", () => {
  async function revealed() {
    h.participants = [player("p1", "Amy")];
    const view = setup();
    await startQuestion(view.result);
    await receive("answer", answer("p1", 1));
    await reveal(view.result);
    h.send.mockClear();
    return view;
  }

  it("ends the session: saves the end and the results, then tells the students", async () => {
    const { result } = await revealed();
    h.order.length = 0;

    act(() => { void result.current.handleFinish(); });
    await settle();

    const { changes, filters } = lastUpdate();
    expect(changes.state).toEqual({ status: "finished" });
    expect(typeof changes.ended_at).toBe("string");
    expect(changes.results).toBeDefined();
    // a session can only be ended once
    expect(filters).toContainEqual(["ended_at", null]);
    expect(h.send.mock.calls[0][0]).toBe("finished");
    expect(h.order).toEqual(["db", "send"]);
    expect(result.current.isFinished).toBe(true);
  });

  it("sends only names, points and ranks of the top players", async () => {
    const { result } = await revealed();

    act(() => { void result.current.handleFinish(); });
    await settle();

    const [, payload] = h.send.mock.calls[0];
    expect(payload.top).toEqual([{ name: "Amy", points: 1000, rank: 1 }]);
    expect(payload.results).toEqual({ p1: { total: 1000, rank: 1 } });
  });

  it("does nothing when the teacher does not confirm", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const { result } = await revealed();
    const updatesBefore = h.updates.length;

    act(() => { void result.current.handleFinish(); });
    await settle();

    expect(h.updates.length).toBe(updatesBefore);
    expect(result.current.isFinished).toBe(false);
  });

  it("cannot end the session while a question is open", async () => {
    const { result } = setup();
    await startQuestion(result);
    const updatesBefore = h.updates.length;

    act(() => { void result.current.handleFinish(); });
    await settle();

    expect(h.updates.length).toBe(updatesBefore);
    expect(globalThis.confirm).not.toHaveBeenCalled();
  });
});

describe("useHostGame: students who join late or refresh", () => {
  it("repeats the open question to a player who just arrived", async () => {
    const { result, rerender } = setup();
    await startQuestion(result);
    h.send.mockClear();

    h.participants = [player("p1", "Amy")];
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    expect(sentEvents()).toEqual(["question"]);
    expect(h.send.mock.calls[0][1]).toMatchObject({ index: 0 });
    expect(JSON.stringify(h.send.mock.calls[0][1])).not.toContain("correctIndex");
  });

  it("repeats the question and the reveal when the question was already revealed", async () => {
    h.participants = [player("p1", "Amy")];
    const { result, rerender } = setup();
    await startQuestion(result);
    await receive("answer", answer("p1", 1));
    await reveal(result);
    h.send.mockClear();

    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    expect(sentEvents()).toEqual(["question", "reveal"]);
    expect(h.send.mock.calls[1][1]).toMatchObject({ index: 0, correctIndex: 1 });
  });

  it("sends once for several players who arrive together", async () => {
    const { result, rerender } = setup();
    await startQuestion(result);
    h.send.mockClear();

    h.participants = [player("p1", "Amy")];
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

    expect(sentEvents()).toEqual(["question"]);
  });

  it("sends nothing when nobody new arrives", async () => {
    h.participants = [player("p1", "Amy")];
    const { result, rerender } = setup();
    await startQuestion(result);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    h.send.mockClear();

    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

    expect(h.send).not.toHaveBeenCalled();
  });

  it("sends nothing while the session is still in the lobby", async () => {
    const { rerender } = setup();

    h.participants = [player("p1", "Amy")];
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });

    expect(h.send).not.toHaveBeenCalled();
  });
});

describe("useHostGame: a refresh", () => {
  it("brings back the scores of the questions already revealed", async () => {
    h.participants = [player("p1", "Amy")];
    const first = setup();
    await startQuestion(first.result);
    await receive("answer", answer("p1", 1));
    await reveal(first.result);
    const saved = lastUpdate().changes;
    first.unmount();

    // a new page load: the session comes from the database, the scores from this browser
    const second = setup({
      ...lobby,
      state: saved.state as LiveSession["state"],
      results: saved.results as LiveSession["results"],
    });

    expect(second.result.current.hasScores).toBe(true);
    expect(second.result.current.board.map((e) => [e.name, e.points])).toEqual([["Amy", 1000]]);
  });

  it("keeps the names saved earlier for players who are no longer connected", async () => {
    h.participants = [player("p1", "Amy")];
    const view = setup({
      ...lobby,
      results: { players: { gone: "Zed" }, questions: [] },
    });
    await startQuestion(view.result);

    await reveal(view.result);

    expect(lastUpdate().changes.results).toMatchObject({ players: { gone: "Zed", p1: "Amy" } });
  });
});

describe("useHostGame: another device", () => {
  // what the database holds after question 1 was revealed to Amy and Bob
  const savedResults: LiveSession["results"] = {
    players: { p1: "Amy", p2: "Bob" },
    questions: [
      {
        id: "q1",
        text: "Q1",
        options: ["a", "b", "c"],
        correctIndex: 1,
        answers: { p1: { choice: 1, points: 1000 }, p2: { choice: 0, points: 0 } },
      },
    ],
  };
  const afterFirstReveal: LiveSession = {
    ...lobby,
    state: { status: "reveal", index: 0, startedAt: 1000 },
    results: savedResults,
  };

  it("rebuilds the scores of the revealed questions when this browser has nothing saved", () => {
    h.participants = [player("p1", "Amy"), player("p2", "Bob")];

    const { result } = setup(afterFirstReveal);

    expect(result.current.hasScores).toBe(true);
    expect(result.current.board.map((e) => [e.name, e.points, e.rank])).toEqual([
      ["Amy", 1000, 1],
      ["Bob", 0, 2],
    ]);
  });

  it("keeps the questions saved earlier when the next question is revealed", async () => {
    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    const { result } = setup(afterFirstReveal);
    await startQuestion(result);
    await receive("answer", answer("p1", 0, 1));
    await receive("answer", answer("p2", 1, 1));

    await reveal(result);

    const saved = lastUpdate().changes.results as LiveSession["results"];
    expect(saved.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(saved.questions[0].answers.p1).toEqual({ choice: 1, points: 1000 });
    expect(result.current.board.map((e) => [e.name, e.points])).toEqual([
      ["Amy", 2000],
      ["Bob", 0],
    ]);
  });

  it("keeps the answers to the open question that this browser saved", () => {
    h.participants = [player("p1", "Amy")];
    localStorage.setItem(
      "live-session:ABC123",
      JSON.stringify({ answers: { 1: { p1: { choice: 0, receivedAt: 5 } } }, scores: {} })
    );

    const { result } = setup({
      ...lobby,
      state: { status: "question", index: 1, startedAt: 1000 },
      results: savedResults,
    });

    expect(result.current.answeredCount).toBe(1);
    // and the revealed question comes from the database
    expect(result.current.hasScores).toBe(true);
  });

  it("starts from an empty board when nothing was revealed yet", () => {
    const { result } = setup();

    expect(result.current.hasScores).toBe(false);
  });
});

describe("useHostGame: switching device in the middle of a question", () => {
  const onQuestion: LiveSession = {
    ...lobby,
    state: { status: "question", index: 0, startedAt: 1000 },
  };

  it("repeats the question to the students, and counts the answers they send again", async () => {
    // this browser has no answers for the open question
    const { result, rerender } = setup(onQuestion);

    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    rerender();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(sentEvents()).toEqual(["question"]);

    await receive("answer", answer("p1", 1));
    await receive("answer", answer("p2", 0));

    expect(result.current.answeredCount).toBe(2);
    expect(result.current.countFor(1)).toBe(1);
    expect(result.current.countFor(0)).toBe(1);
  });

  it("counts an answer once, even when it arrives again", async () => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup(onQuestion);

    await receive("answer", answer("p1", 1));
    await receive("answer", answer("p1", 1));

    expect(result.current.answeredCount).toBe(1);
  });

  it("keeps the first choice if a repeated answer says something else", async () => {
    h.participants = [player("p1", "Amy")];
    const { result } = setup(onQuestion);

    await receive("answer", answer("p1", 1));
    await receive("answer", answer("p1", 2));

    expect(result.current.countFor(1)).toBe(1);
    expect(result.current.countFor(2)).toBe(0);
  });

  it("scores the answers it got back once the question is revealed", async () => {
    h.participants = [player("p1", "Amy"), player("p2", "Bob")];
    const { result } = setup(onQuestion);
    await receive("answer", answer("p1", 1));
    await receive("answer", answer("p2", 0));

    await reveal(result);

    expect(result.current.board.map((e) => [e.name, e.points])).toEqual([
      ["Amy", 1000],
      ["Bob", 0],
    ]);
  });
});
