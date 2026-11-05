import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

type Result = { data: unknown; error: unknown };

// a fake of the query builder: every step returns itself, and awaiting it gives the result
function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const step of ["select", "eq", "delete"]) b[step] = () => b;
  b.maybeSingle = () => Promise.resolve(result);
  b.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return b;
}

const from = vi.fn();
vi.mock("../lib/supabase", () => ({ supabase: { from: (table: string) => from(table) } }));

import useActivitySessions from "./useActivitySessions";

const results = { players: {}, questions: [] };
const ended = {
  id: "s-ended",
  code: "ENDED1",
  created_at: "2026-11-02T10:00:00Z",
  ended_at: "2026-11-02T11:00:00Z",
  scoring_mode: "fixed",
  results,
};
const running = {
  ...ended,
  id: "s-running",
  code: "RUN111",
  created_at: "2026-11-03T10:00:00Z",
  ended_at: null,
};

// what each table answers; "deleted" is the answer to deleting a session
function backend(opts: { activity?: Result; sessions?: Result; deleted?: Result }) {
  const activity = opts.activity ?? { data: { title: "نشاط" }, error: null };
  const sessions = opts.sessions ?? { data: [ended, running], error: null };
  const deleted = opts.deleted ?? { data: [{ id: "s-ended" }], error: null };
  let sessionCalls = 0;
  from.mockImplementation((table: string) => {
    if (table === "activities") return builder(activity);
    sessionCalls++;
    // the first call loads the list, the next one is the delete
    return builder(sessionCalls === 1 ? sessions : deleted);
  });
}

// the hook logs failures on purpose: keep the test output clean
let errorSpy: { mockRestore: () => void };

beforeEach(() => {
  from.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => errorSpy.mockRestore());

describe("useActivitySessions", () => {
  it("loads the title and lists the sessions, newest first", async () => {
    backend({});
    const { result } = renderHook(() => useActivitySessions("a1"));

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.title).toBe("نشاط");
    expect(result.current.items.map((item) => item.code)).toEqual(["RUN111", "ENDED1"]);
  });

  it("reports not-found when the activity does not exist", async () => {
    backend({ activity: { data: null, error: null } });
    const { result } = renderHook(() => useActivitySessions("a1"));

    await waitFor(() => expect(result.current.status).toBe("not-found"));
  });

  it("reports an error when a query fails", async () => {
    backend({ sessions: { data: null, error: { message: "boom" } } });
    const { result } = renderHook(() => useActivitySessions("a1"));

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("reports an error when the saved data has the wrong shape", async () => {
    backend({ sessions: { data: [{ id: 5 }], error: null } });
    const { result } = renderHook(() => useActivitySessions("a1"));

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("removes an ended session from the list once it is deleted", async () => {
    backend({});
    const { result } = renderHook(() => useActivitySessions("a1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => result.current.deleteSession("s-ended"));

    expect(result.current.items.map((item) => item.code)).toEqual(["RUN111"]);
    expect(result.current.deleteError).toBe("");
    expect(result.current.deletingId).toBeNull();
  });

  it("keeps the session and shows an error when the delete removed nothing", async () => {
    backend({ deleted: { data: [], error: null } });
    const { result } = renderHook(() => useActivitySessions("a1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => result.current.deleteSession("s-ended"));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.deleteError).not.toBe("");
  });

  it("keeps the session and shows an error when the delete fails", async () => {
    backend({ deleted: { data: null, error: { message: "boom" } } });
    const { result } = renderHook(() => useActivitySessions("a1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(() => result.current.deleteSession("s-ended"));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.deleteError).not.toBe("");
  });

  it("never sends a delete for a session that is still running", async () => {
    backend({});
    const { result } = renderHook(() => useActivitySessions("a1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const callsBefore = from.mock.calls.length;

    await act(() => result.current.deleteSession("s-running"));

    expect(from.mock.calls.length).toBe(callsBefore);
    expect(result.current.items).toHaveLength(2);
  });

  it("clears an old delete error when another delete starts", async () => {
    backend({ deleted: { data: [], error: null } });
    const { result } = renderHook(() => useActivitySessions("a1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.deleteSession("s-ended"));
    expect(result.current.deleteError).not.toBe("");

    from.mockImplementation(() => builder({ data: [{ id: "s-ended" }], error: null }));
    await act(() => result.current.deleteSession("s-ended"));

    expect(result.current.deleteError).toBe("");
  });
});