import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({ fake: true })));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

// the module keeps its client between calls, so each test loads it fresh
async function load() {
  vi.resetModules();
  return import("./studentSupabase");
}

type Call = [string, string, { auth: { storageKey: string; storage: unknown; persistSession: boolean } }];
const firstCall = () => createClient.mock.calls[0] as unknown as Call;

beforeEach(() => {
  createClient.mockClear();
  vi.stubEnv("VITE_SUPABASE_URL", "https://abcdefgh.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
});

afterEach(() => vi.unstubAllEnvs());

describe("getStudentClient", () => {
  it("does not create a client until one is asked for", async () => {
    await load();

    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates the client once and hands out the same one afterwards", async () => {
    const { getStudentClient } = await load();

    const first = getStudentClient();
    const second = getStudentClient();

    expect(second).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("uses the project's address and key", async () => {
    const { getStudentClient } = await load();

    getStudentClient();

    expect(firstCall()[0]).toBe("https://abcdefgh.supabase.co");
    expect(firstCall()[1]).toBe("sb_publishable_test");
  });

  it("keeps the identity in the tab only, so it goes away when the tab closes", async () => {
    const { getStudentClient } = await load();

    getStudentClient();

    expect(firstCall()[2].auth.storage).toBe(sessionStorage);
    expect(firstCall()[2].auth.persistSession).toBe(true);
  });

  it("names the stored session after the project, so another project's session is never reused", async () => {
    const { getStudentClient } = await load();
    getStudentClient();
    const keyA = firstCall()[2].auth.storageKey;

    createClient.mockClear();
    vi.stubEnv("VITE_SUPABASE_URL", "https://zzzzzzzz.supabase.co");
    const again = await load();
    again.getStudentClient();
    const keyB = firstCall()[2].auth.storageKey;

    expect(keyA).toBe("sb-abcdefgh-student-auth");
    expect(keyB).toBe("sb-zzzzzzzz-student-auth");
    expect(keyA).not.toBe(keyB);
  });

  it("keeps it apart from the teacher's session", async () => {
    const { getStudentClient } = await load();

    getStudentClient();

    // the teacher's client uses the library's own key, which has no "student" in it
    expect(firstCall()[2].auth.storageKey).toContain("student");
  });

  it("still works when the address is not a valid URL", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "not a url");
    const { getStudentClient } = await load();

    getStudentClient();

    expect(firstCall()[2].auth.storageKey).toBe("sb-student-auth");
  });
});