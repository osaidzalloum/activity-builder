import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FinalEvent, QuestionEvent, RevealEvent } from "../types";

// shared with the mocks below, which vitest moves to the top of the file
const h = vi.hoisted(() => ({
  participants: [] as unknown[],
  send: vi.fn(),
  checkSession: vi.fn(),
  onBroadcast: undefined as ((event: string, payload: unknown) => void) | undefined,
  channelArgs: [] as unknown[],
}));

// the realtime channel: the test decides who is connected and what arrives
vi.mock("./useLiveChannel", () => ({
  default: (
    code: unknown,
    id: unknown,
    name: unknown,
    role: unknown,
    onBroadcast: (event: string, payload: unknown) => void
  ) => {
    h.channelArgs = [code, id, name, role];
    h.onBroadcast = onBroadcast;
    return { participants: h.participants, send: h.send };
  },
}));

vi.mock("../lib/joinSession", () => ({ checkSession: h.checkSession }));

import useStudentGame from "./useStudentGame";

const KEY = "live-player";

const question = (index: number): QuestionEvent => ({
  index,
  total: 3,
  startedAt: 1000,
  scoring: "fixed",
  question: { id: `q${index}`, type: "mcq", text: `Q${index}`, options: ["a", "b", "c"] },
});

const revealOf = (index: number, results: RevealEvent["results"] = {}): RevealEvent => ({
  index,
  correctIndex: 1,
  top: [{ name: "Amy", points: 1000, rank: 1 }],
  results,
});

const stored = (answer?: { index: number; choice: number }) => ({
  code: "ABC123",
  name: "Amy",
  playerId: "me",
  ...(answer ? { answer } : {}),
});

const savedPlayer = () => JSON.parse(sessionStorage.getItem(KEY) ?? "null");
const receive = (event: string, payload: unknown) => act(() => h.onBroadcast!(event, payload));
const myId = () => h.channelArgs[1] as string;

type Hook = ReturnType<typeof setup>["result"];

function setup() {
  return renderHook(() => useStudentGame());
}

async function join(result: Hook, code = "abc123", name = "Amy") {
  let message: string | null = "not run";
  await act(async () => { message = await result.current.join(code, name); });
  return message;
}

// joins a session and waits until a question is on screen
async function inQuestion(index = 0) {
  h.checkSession.mockResolvedValue("active");
  const view = setup();
  await join(view.result);
  await receive("question", question(index));
  return view;
}

const choose = (result: Hook, choice: number) =>
  act(async () => { await result.current.handleChoose(choice); });

beforeEach(() => {
  sessionStorage.clear();
  h.participants = [];
  h.onBroadcast = undefined;
  h.channelArgs = [];
  h.send.mockReset();
  h.send.mockResolvedValue(true);
  h.checkSession.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useStudentGame: joining", () => {
  it("starts on the form and stays out of the channel", () => {
    const { result } = setup();

    expect(result.current.restoring).toBe(false);
    expect(result.current.joined).toBeNull();
    expect(h.channelArgs[0]).toBeUndefined();
  });

  it.each([
    ["a code that is too short", "ABC", "Amy"],
    ["a code that is too long", "ABCDEFG", "Amy"],
    ["an empty name", "ABC123", "   "],
    ["a name that is too long", "ABC123", "x".repeat(51)],
  ])("refuses %s without asking the database", async (_label, code, name) => {
    const { result } = setup();

    const message = await join(result, code, name);

    expect(message).toEqual(expect.any(String));
    expect(h.checkSession).not.toHaveBeenCalled();
    expect(result.current.joined).toBeNull();
  });

  it("says so when the code is wrong or the session ended", async () => {
    h.checkSession.mockResolvedValue("not-found");
    const { result } = setup();

    const message = await join(result);

    expect(message).toContain("الكود غير صحيح");
    expect(result.current.joined).toBeNull();
    expect(savedPlayer()).toBeNull();
  });

  it("says so when the check itself fails", async () => {
    h.checkSession.mockResolvedValue("error");
    const { result } = setup();

    const message = await join(result);

    expect(message).toEqual(expect.any(String));
    expect(result.current.joined).toBeNull();
  });

  it("joins: cleans the code, saves the identity and connects to the channel", async () => {
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();

    const message = await join(result, "  abc123 ", "  Amy  ");

    expect(message).toBeNull();
    expect(h.checkSession).toHaveBeenCalledWith("ABC123");
    expect(result.current.joined).toEqual({ code: "ABC123", name: "Amy" });
    expect(savedPlayer()).toMatchObject({ code: "ABC123", name: "Amy", playerId: myId() });
    expect(h.channelArgs.slice(0, 1).concat(h.channelArgs.slice(2))).toEqual(["ABC123", "Amy", "player"]);
  });

  it("starts a new join without the answer of an earlier session", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored({ index: 0, choice: 2 })));
    h.checkSession.mockResolvedValue("not-found");
    const { result } = setup();
    await waitFor(() => expect(result.current.restoring).toBe(false));

    h.checkSession.mockResolvedValue("active");
    await join(result, "ZZZZZZ", "Bob");
    await receive("question", question(0));

    expect(result.current.selected).toBeNull();
  });
});

describe("useStudentGame: the question and the answer", () => {
  it("shows the question that arrives", async () => {
    const { result } = await inQuestion(0);

    expect(result.current.current?.question.text).toBe("Q0");
    expect(result.current.selected).toBeNull();
  });

  it("sends the answer with the student's identity and remembers it", async () => {
    const { result } = await inQuestion(0);

    await choose(result, 1);

    expect(h.send).toHaveBeenCalledWith("answer", { playerId: myId(), index: 0, choice: 1 });
    expect(result.current.selected).toBe(1);
    expect(savedPlayer().answer).toEqual({ index: 0, choice: 1 });
  });

  it("does not send a second answer to the same question", async () => {
    const { result } = await inQuestion(0);
    await choose(result, 1);

    await choose(result, 2);

    expect(h.send).toHaveBeenCalledTimes(1);
    expect(result.current.selected).toBe(1);
  });

  it("lets the student try again when the answer does not arrive", async () => {
    const { result } = await inQuestion(0);
    h.send.mockResolvedValue(false);

    await choose(result, 1);

    expect(result.current.selected).toBeNull();
    expect(result.current.answerError).not.toBe("");
    expect(savedPlayer().answer).toBeUndefined();

    h.send.mockResolvedValue(true);
    await choose(result, 1);
    expect(result.current.selected).toBe(1);
    expect(result.current.answerError).toBe("");
  });

  it("does nothing before a question has arrived", async () => {
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();
    await join(result);

    await choose(result, 1);

    expect(h.send).not.toHaveBeenCalled();
  });

  it("keeps the answer when the host repeats the same question", async () => {
    const { result } = await inQuestion(0);
    await choose(result, 1);

    await receive("question", question(0));

    expect(result.current.selected).toBe(1);
  });

  it("ignores an older question that arrives late", async () => {
    const { result } = await inQuestion(1);

    await receive("question", question(0));

    expect(result.current.current?.index).toBe(1);
  });

  it("moves to the next question with a clean choice", async () => {
    const { result } = await inQuestion(0);
    await choose(result, 1);

    await receive("question", question(1));

    expect(result.current.current?.index).toBe(1);
    expect(result.current.selected).toBeNull();
  });

  it.each([
    ["not an object", "oops"],
    ["without options", { index: 0, total: 3, startedAt: 1, scoring: "fixed", question: { id: "q", type: "mcq", text: "x" } }],
    ["with an unknown scoring mode", { ...question(0), scoring: "double" }],
  ])("ignores a question event that is %s", async (_label, payload) => {
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();
    await join(result);

    await receive("question", payload);

    expect(result.current.current).toBeNull();
  });

  it("drops a correct answer that was sent by mistake", async () => {
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();
    await join(result);

    await receive("question", {
      ...question(0),
      question: { ...question(0).question, correctIndex: 1 },
    });

    expect(result.current.current?.question).not.toHaveProperty("correctIndex");
  });
});

describe("useStudentGame: the reveal", () => {
  it("shows the reveal and the student's own result", async () => {
    const { result } = await inQuestion(0);
    await receive("reveal", revealOf(0, { [myId()]: { gained: 1000, total: 1000, rank: 1 } }));

    expect(result.current.reveal?.correctIndex).toBe(1);
    expect(result.current.myResult).toEqual({ gained: 1000, total: 1000, rank: 1 });
  });

  it("has no personal result when the student is not on the board", async () => {
    const { result } = await inQuestion(0);

    await receive("reveal", revealOf(0, { someoneElse: { gained: 0, total: 0, rank: 2 } }));

    expect(result.current.reveal).not.toBeNull();
    expect(result.current.myResult).toBeNull();
  });

  it("does not use the result of another question", async () => {
    const { result } = await inQuestion(1);

    await receive("reveal", revealOf(0, { [myId()]: { gained: 1000, total: 1000, rank: 1 } }));

    expect(result.current.reveal).toBeNull();
    expect(result.current.myResult).toBeNull();
  });

  it("keeps the first reveal when it is repeated with other numbers", async () => {
    const { result } = await inQuestion(0);
    await receive("reveal", revealOf(0, { [myId()]: { gained: 1000, total: 1000, rank: 1 } }));

    await receive("reveal", revealOf(0, { [myId()]: { gained: 1000, total: 1000, rank: 3 } }));

    expect(result.current.myResult?.rank).toBe(1);
  });

  it("hides the reveal again when the next question arrives", async () => {
    const { result } = await inQuestion(0);
    await receive("reveal", revealOf(0));

    await receive("question", question(1));

    expect(result.current.reveal).toBeNull();
  });

  it("ignores a reveal with the wrong shape", async () => {
    const { result } = await inQuestion(0);

    await receive("reveal", { index: 0 });

    expect(result.current.reveal).toBeNull();
  });
});

describe("useStudentGame: the end", () => {
  const finalEvent = (id: string): FinalEvent => ({
    top: [{ name: "Amy", points: 2000, rank: 1 }],
    results: { [id]: { total: 2000, rank: 1 } },
  });

  it("shows the final standings and forgets the saved player", async () => {
    const { result } = await inQuestion(0);
    expect(savedPlayer()).not.toBeNull();

    await receive("finished", finalEvent(myId()));

    expect(result.current.final?.top).toHaveLength(1);
    expect(result.current.myFinal).toEqual({ total: 2000, rank: 1 });
    expect(savedPlayer()).toBeNull();
  });

  it("has no personal result when the student is not in the standings", async () => {
    const { result } = await inQuestion(0);

    await receive("finished", finalEvent("someoneElse"));

    expect(result.current.final).not.toBeNull();
    expect(result.current.myFinal).toBeNull();
  });

  it("ignores a final event with the wrong shape", async () => {
    const { result } = await inQuestion(0);

    await receive("finished", { top: "nobody" });

    expect(result.current.final).toBeNull();
    expect(savedPlayer()).not.toBeNull();
  });

  it("leaves: forgets the saved player and reloads the page", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    const { result } = await inQuestion(0);

    act(() => result.current.handleLeave());

    expect(savedPlayer()).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("useStudentGame: coming back after a refresh", () => {
  it("restores the student into a session that is still running", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored()));
    h.checkSession.mockResolvedValue("active");

    const { result } = setup();
    expect(result.current.restoring).toBe(true);
    await waitFor(() => expect(result.current.restoring).toBe(false));

    expect(h.checkSession).toHaveBeenCalledWith("ABC123");
    expect(result.current.joined).toEqual({ code: "ABC123", name: "Amy" });
    expect(myId()).toBe("me");
  });

  it("shows the saved answer once the question arrives again", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored({ index: 0, choice: 2 })));
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();
    await waitFor(() => expect(result.current.restoring).toBe(false));

    await receive("question", question(0));

    expect(result.current.selected).toBe(2);
  });

  it("does not show a saved answer on a different question", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored({ index: 0, choice: 2 })));
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();
    await waitFor(() => expect(result.current.restoring).toBe(false));

    await receive("question", question(1));

    expect(result.current.selected).toBeNull();
  });

  it("sends the student back to the form when the session has ended", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored()));
    h.checkSession.mockResolvedValue("not-found");

    const { result } = setup();
    await waitFor(() => expect(result.current.restoring).toBe(false));

    expect(result.current.joined).toBeNull();
    expect(savedPlayer()).toBeNull();
  });

  it("keeps the saved player when the check fails, so the next refresh can try again", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored()));
    h.checkSession.mockResolvedValue("error");

    const { result } = setup();
    await waitFor(() => expect(result.current.restoring).toBe(false));

    expect(result.current.joined).toBeNull();
    expect(savedPlayer()).not.toBeNull();
  });

  it("ignores saved data that is damaged", async () => {
    sessionStorage.setItem(KEY, "{oops");

    const { result } = setup();

    expect(result.current.restoring).toBe(false);
    expect(h.checkSession).not.toHaveBeenCalled();
  });
});

describe("useStudentGame: who is here", () => {
  it("lists the players without the host, and knows when the host is connected", async () => {
    h.participants = [
      { id: "host", name: "Host", role: "host" },
      { id: "me", name: "Amy", role: "player" },
      { id: "p2", name: "Bob", role: "player" },
    ];
    const { result } = setup();

    expect(result.current.players.map((p) => p.name)).toEqual(["Amy", "Bob"]);
    expect(result.current.hostConnected).toBe(true);
  });

  it("knows when the host is not connected", () => {
    h.participants = [{ id: "me", name: "Amy", role: "player" }];
    const { result } = setup();

    expect(result.current.hostConnected).toBe(false);
  });
});

describe("useStudentGame: sending the answer again", () => {
  it("sends the answer again when the host repeats the question", async () => {
    const { result } = await inQuestion(0);
    await choose(result, 1);
    h.send.mockClear();

    await receive("question", question(0));

    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.send).toHaveBeenCalledWith("answer", { playerId: myId(), index: 0, choice: 1 });
  });

  it("keeps the same choice on screen after sending it again", async () => {
    const { result } = await inQuestion(0);
    await choose(result, 1);

    await receive("question", question(0));

    expect(result.current.selected).toBe(1);
  });

  it("sends nothing when the student has not answered", async () => {
    const { result } = await inQuestion(0);
    expect(result.current.selected).toBeNull();

    await receive("question", question(0));

    expect(h.send).not.toHaveBeenCalled();
  });

  it("does not send the old answer for the next question", async () => {
    const { result } = await inQuestion(0);
    await choose(result, 1);
    h.send.mockClear();

    await receive("question", question(1));

    expect(h.send).not.toHaveBeenCalled();
  });

  it("does not send an answer that never reached the host", async () => {
    const { result } = await inQuestion(0);
    h.send.mockResolvedValue(false);
    await choose(result, 1);
    h.send.mockClear();

    await receive("question", question(0));

    expect(h.send).not.toHaveBeenCalled();
  });

  it("sends the remembered answer after a refresh, when the question arrives again", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored({ index: 0, choice: 2 })));
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();
    await waitFor(() => expect(result.current.restoring).toBe(false));

    await receive("question", question(0));

    expect(h.send).toHaveBeenCalledWith("answer", { playerId: "me", index: 0, choice: 2 });
  });

  it("does not send a remembered answer that belongs to another question", async () => {
    sessionStorage.setItem(KEY, JSON.stringify(stored({ index: 0, choice: 2 })));
    h.checkSession.mockResolvedValue("active");
    const { result } = setup();
    await waitFor(() => expect(result.current.restoring).toBe(false));

    await receive("question", question(1));

    expect(h.send).not.toHaveBeenCalled();
  });

  it("sends the answer again each time the host repeats the question", async () => {
    const { result } = await inQuestion(0);
    await choose(result, 1);
    h.send.mockClear();

    await receive("question", question(0));
    await receive("question", question(0));

    expect(h.send).toHaveBeenCalledTimes(2);
  });
});