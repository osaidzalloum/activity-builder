import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";

type Binding = { type: string; filter: { event?: string }; callback: (payload?: unknown) => void };
type FakeChannel = {
    topic: string;
    config: { config: Record<string, unknown> };
    bindings: Binding[];
    statusCallback?: (status: string) => void;
    presence: Record<string, unknown[]>;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
    track: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    presenceState: ReturnType<typeof vi.fn>;
};

// shared with the mocks below, which vitest moves to the top of the file
const h = vi.hoisted(() => {
    const log: string[] = [];

    function makeChannel(topic: string, config: { config: Record<string, unknown> }) {
        const channel = {
            topic,
            config,
            bindings: [] as Binding[],
            statusCallback: undefined as ((status: string) => void) | undefined,
            presence: {} as Record<string, unknown[]>,
        } as unknown as FakeChannel;
        channel.on = vi.fn((type: string, filter: { event?: string }, callback: () => void) => {
            channel.bindings.push({ type, filter, callback });
            return channel;
        });
        channel.subscribe = vi.fn((callback: (status: string) => void) => {
            channel.statusCallback = callback;
            return channel;
        });
        channel.track = vi.fn(async () => "ok");
        channel.send = vi.fn(async () => "ok");
        channel.presenceState = vi.fn(() => channel.presence);
        log.push(`channel ${topic}`);
        return channel;
    }

    function makeClient(name: string) {
        const channels: FakeChannel[] = [];
        return {
            channels,
            channel: vi.fn((topic: string, config: { config: Record<string, unknown> }) => {
                const channel = makeChannel(topic, config);
                channels.push(channel);
                return channel;
            }),
            removeChannel: vi.fn(async () => "ok"),
            realtime: {
                setAuth: vi.fn(async () => {
                    log.push(`${name} setAuth`);
                }),
            },
            auth: {
                getSession: vi.fn(async () => ({ data: { session: null as unknown } })),
                signInAnonymously: vi.fn(async () => {
                    log.push(`${name} signIn`);
                    return { data: {}, error: null as unknown };
                }),
            },
        };
    }

    return { log, teacher: makeClient("teacher"), student: makeClient("student") };
});

vi.mock("../lib/supabase", () => ({ supabase: h.teacher }));
vi.mock("../lib/studentSupabase", () => ({ getStudentClient: () => h.student }));

import useLiveChannel from "./useLiveChannel";

type Client = typeof h.teacher;
const channelOf = (client: Client, topic: string) =>
    client.channels.find((channel) => channel.topic === topic)!;
const bindingsOf = (channel: FakeChannel, type: string) =>
    channel.bindings.filter((binding) => binding.type === type);

function render(role: "host" | "player", handler?: (event: string, payload: unknown) => void) {
    return renderHook(
        ({ code, id, name }) => useLiveChannel(code, id, name, role, handler),
        { initialProps: { code: "ABC123" as string | undefined, id: "me" as string | undefined, name: "Amy" as string | undefined } }
    );
}

// the channels are created after the sign-in, so wait for them
const ready = (client: Client) => waitFor(() => expect(client.channels).toHaveLength(2));
const status = (channel: FakeChannel, value: string) =>
    act(async () => { await channel.statusCallback!(value); });

beforeEach(() => {
    h.log.length = 0;
    for (const client of [h.teacher, h.student]) {
        client.channels.length = 0;
        client.channel.mockClear();
        client.removeChannel.mockClear();
        client.realtime.setAuth.mockClear();
        client.auth.getSession.mockClear();
        client.auth.getSession.mockResolvedValue({ data: { session: null } });
        client.auth.signInAnonymously.mockClear();
        client.auth.signInAnonymously.mockImplementation(async () => {
            h.log.push("student signIn");
            return { data: {}, error: null };
        });
    }
    vi.spyOn(console, "error").mockImplementation(() => { });
});

afterEach(() => vi.restoreAllMocks());

describe("useLiveChannel: the two private channels", () => {
    it("does nothing until the code, the id and the name are known", async () => {
        const view = render("host");
        view.rerender({ code: undefined, id: "me", name: "Amy" });
        view.rerender({ code: "ABC123", id: undefined, name: "Amy" });
        view.rerender({ code: "ABC123", id: "me", name: undefined });
        await act(async () => { await Promise.resolve(); });

        expect(h.teacher.channel).not.toHaveBeenCalled();
    });

    it("joins live:CODE and answers:CODE, both private", async () => {
        render("host");
        await ready(h.teacher);

        expect(h.teacher.channels.map((channel) => channel.topic)).toEqual(["live:ABC123", "answers:ABC123"]);
        for (const channel of h.teacher.channels) {
            expect(channel.config.config.private).toBe(true);
            expect(channel.config.config.broadcast).toEqual({ ack: true });
        }
    });

    it("uses the player's id as the presence key on the live channel", async () => {
        render("player");
        await ready(h.student);

        expect(channelOf(h.student, "live:ABC123").config.config.presence).toEqual({ key: "me" });
    });

    it("gives the teacher the normal client and a student the student client", async () => {
        render("host");
        await ready(h.teacher);
        expect(h.student.channel).not.toHaveBeenCalled();

        render("player");
        await ready(h.student);
        expect(h.teacher.channels).toHaveLength(2);
    });

    it("leaves both channels when the screen goes away", async () => {
        const view = render("host");
        await ready(h.teacher);

        view.unmount();

        expect(h.teacher.removeChannel).toHaveBeenCalledTimes(2);
        expect(h.teacher.removeChannel).toHaveBeenCalledWith(channelOf(h.teacher, "live:ABC123"));
        expect(h.teacher.removeChannel).toHaveBeenCalledWith(channelOf(h.teacher, "answers:ABC123"));
    });

    it("moves to the new channels when the code changes", async () => {
        const view = render("host");
        await ready(h.teacher);

        view.rerender({ code: "ZZZ999", id: "me", name: "Amy" });

        await waitFor(() => expect(h.teacher.channels).toHaveLength(4));
        expect(h.teacher.removeChannel).toHaveBeenCalledTimes(2);
        expect(h.teacher.channels.slice(2).map((channel) => channel.topic)).toEqual(["live:ZZZ999", "answers:ZZZ999"]);
    });
});

describe("useLiveChannel: signing in", () => {
    it("signs a student in anonymously, then hands the token to Realtime, then joins", async () => {
        render("player");
        await ready(h.student);

        expect(h.log).toEqual(["student signIn", "student setAuth", "channel live:ABC123", "channel answers:ABC123"]);
    });

    it("does not sign a student in again when the tab already has an identity", async () => {
        h.student.auth.getSession.mockResolvedValue({ data: { session: { user: {} } } });

        render("player");
        await ready(h.student);

        expect(h.student.auth.signInAnonymously).not.toHaveBeenCalled();
    });

    it("never signs the teacher in anonymously, but still hands the token to Realtime", async () => {
        render("host");
        await ready(h.teacher);

        expect(h.teacher.auth.signInAnonymously).not.toHaveBeenCalled();
        expect(h.log).toEqual(["teacher setAuth", "channel live:ABC123", "channel answers:ABC123"]);
    });

    it("does not join, and reports a failure, when the anonymous sign-in is refused", async () => {
        h.student.auth.signInAnonymously.mockResolvedValue({ data: {}, error: { message: "rate limit" } });

        const { result } = render("player");

        await waitFor(() => expect(result.current.failed).toBe(true));
        expect(h.student.channel).not.toHaveBeenCalled();
        expect(await result.current.send("answer", {})).toBe(false);
    });

    it("does not join when the screen went away while signing in", async () => {
        let finish: (value: { data: object; error: null }) => void = () => { };
        h.student.auth.signInAnonymously.mockImplementation(
            () => new Promise((resolve) => { finish = resolve; })
        );
        const view = render("player");
        await act(async () => { await Promise.resolve(); });

        view.unmount();
        await act(async () => { finish({ data: {}, error: null }); });

        expect(h.student.channel).not.toHaveBeenCalled();
    });
});

describe("useLiveChannel: who hears what", () => {
    it("lets the host hear the answers channel, and not the live channel", async () => {
        render("host", vi.fn());
        await ready(h.teacher);

        expect(bindingsOf(channelOf(h.teacher, "answers:ABC123"), "broadcast")).toHaveLength(1);
        expect(bindingsOf(channelOf(h.teacher, "live:ABC123"), "broadcast")).toHaveLength(0);
    });

    it("lets a student hear the live channel, and not the answers channel", async () => {
        render("player", vi.fn());
        await ready(h.student);

        expect(bindingsOf(channelOf(h.student, "live:ABC123"), "broadcast")).toHaveLength(1);
        expect(bindingsOf(channelOf(h.student, "answers:ABC123"), "broadcast")).toHaveLength(0);
    });

    it("hands what the host hears to the handler", async () => {
        const handler = vi.fn();
        render("host", handler);
        await ready(h.teacher);

        act(() =>
            bindingsOf(channelOf(h.teacher, "answers:ABC123"), "broadcast")[0].callback({
                event: "answer",
                payload: { choice: 1 },
            })
        );

        expect(handler).toHaveBeenCalledWith("answer", { choice: 1 });
    });

    it("hands what a student hears to the handler", async () => {
        const handler = vi.fn();
        render("player", handler);
        await ready(h.student);

        act(() =>
            bindingsOf(channelOf(h.student, "live:ABC123"), "broadcast")[0].callback({
                event: "question",
                payload: { index: 0 },
            })
        );

        expect(handler).toHaveBeenCalledWith("question", { index: 0 });
    });

    it("uses the latest handler without joining again", async () => {
        const first = vi.fn();
        const second = vi.fn();
        const view = renderHook(
            ({ handler }) => useLiveChannel("ABC123", "me", "Amy", "host", handler),
            { initialProps: { handler: first } }
        );
        await ready(h.teacher);

        view.rerender({ handler: second });
        act(() =>
            bindingsOf(channelOf(h.teacher, "answers:ABC123"), "broadcast")[0].callback({
                event: "answer",
                payload: {},
            })
        );

        expect(h.teacher.channels).toHaveLength(2);
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledTimes(1);
    });
});

describe("useLiveChannel: presence", () => {
    const entry = (id: string, name: string, role: string) => ({ id, name, role });

    it("announces itself once the live channel is joined, not before", async () => {
        render("player");
        await ready(h.student);
        const live = channelOf(h.student, "live:ABC123");
        expect(live.track).not.toHaveBeenCalled();

        await status(live, "SUBSCRIBED");

        expect(live.track).toHaveBeenCalledWith({ id: "me", name: "Amy", role: "player" });
    });

    it("lists who is connected, and ignores entries that are not valid", async () => {
        const { result } = render("host");
        await ready(h.teacher);
        const live = channelOf(h.teacher, "live:ABC123");
        live.presence = {
            a: [entry("a", "Amy", "player")],
            b: [entry("b", "Bob", "player"), { nonsense: true }],
            c: [entry("c", "", "player")],
            d: [entry("d", "Dan", "wizard")],
        };

        act(() => bindingsOf(live, "presence")[0].callback());

        expect(result.current.participants.map((p) => p.name)).toEqual(["Amy", "Bob"]);
    });
});

describe("useLiveChannel: sending", () => {
    it("sends the host's events on the live channel", async () => {
        const { result } = render("host");
        await ready(h.teacher);

        const sent = await result.current.send("question", { index: 0 });

        expect(sent).toBe(true);
        expect(channelOf(h.teacher, "live:ABC123").send).toHaveBeenCalledWith({
            type: "broadcast",
            event: "question",
            payload: { index: 0 },
        });
        expect(channelOf(h.teacher, "answers:ABC123").send).not.toHaveBeenCalled();
    });

    it("sends a student's answer on the answers channel", async () => {
        const { result } = render("player");
        await ready(h.student);

        const sent = await result.current.send("answer", { index: 0, choice: 1 });

        expect(sent).toBe(true);
        expect(channelOf(h.student, "answers:ABC123").send).toHaveBeenCalledWith({
            type: "broadcast",
            event: "answer",
            payload: { index: 0, choice: 1 },
        });
        expect(channelOf(h.student, "live:ABC123").send).not.toHaveBeenCalled();
    });

    it("says it was not delivered when there are no channels yet", async () => {
        let finish: () => void = () => { };
        h.student.auth.signInAnonymously.mockImplementation(
            () => new Promise((resolve) => { finish = () => resolve({ data: {}, error: null }); })
        );
        const { result } = render("player");

        expect(await result.current.send("answer", {})).toBe(false);

        // let the sign-in end, so it does not stay pending for the tests that come next
        await act(async () => { finish(); });
    });

    it("says it was not delivered when the server does not confirm", async () => {
        const { result } = render("player");
        await ready(h.student);
        channelOf(h.student, "answers:ABC123").send.mockResolvedValue("timed out");

        expect(await result.current.send("answer", {})).toBe(false);
    });
});

describe("useLiveChannel: when a channel cannot be joined", () => {
    it("reports a failure when the live channel is refused, and recovers once it is joined", async () => {
        const { result } = render("player");
        await ready(h.student);
        const live = channelOf(h.student, "live:ABC123");
        expect(result.current.failed).toBe(false);

        await status(live, "CHANNEL_ERROR");
        expect(result.current.failed).toBe(true);

        await status(live, "SUBSCRIBED");
        expect(result.current.failed).toBe(false);
    });

    it("reports a failure when the answers channel times out", async () => {
        const { result } = render("player");
        await ready(h.student);

        await status(channelOf(h.student, "answers:ABC123"), "TIMED_OUT");

        expect(result.current.failed).toBe(true);
    });

    it("stays failed while either channel is still broken", async () => {
        const { result } = render("player");
        await ready(h.student);
        const live = channelOf(h.student, "live:ABC123");
        const answers = channelOf(h.student, "answers:ABC123");
        await status(live, "CHANNEL_ERROR");
        await status(answers, "TIMED_OUT");

        await status(live, "SUBSCRIBED");

        expect(result.current.failed).toBe(true);
    });

    it("ignores statuses that are neither good nor bad", async () => {
        const { result } = render("player");
        await ready(h.student);

        await status(channelOf(h.student, "live:ABC123"), "CLOSED");

        expect(result.current.failed).toBe(false);
    });
});


describe("useLiveChannel: signing in only once", () => {
  it("signs in once even when React starts the effect twice", async () => {
    renderHook(() => useLiveChannel("ABC123", "me", "Amy", "player"), { wrapper: StrictMode });

    await ready(h.student);

    expect(h.student.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(h.student.channels).toHaveLength(2);
  });

  it("asks again for an identity after a sign-in that failed", async () => {
    h.student.auth.signInAnonymously.mockResolvedValueOnce({ data: {}, error: { message: "rate limit" } });
    const first = render("player");
    await waitFor(() => expect(first.result.current.failed).toBe(true));
    first.unmount();

    render("player");
    await ready(h.student);

    expect(h.student.auth.signInAnonymously).toHaveBeenCalledTimes(2);
  });
});

describe("useLiveChannel: finding out why a channel failed", () => {
  it("logs why a channel could not be joined", async () => {
    render("player");
    await ready(h.student);
    const reason = new Error("You do not have permissions to read from this Channel topic");
    const answers = channelOf(h.student, "answers:ABC123");

    await act(async () => {
      await (answers.statusCallback as (status: string, reason?: Error) => void)("CHANNEL_ERROR", reason);
    });

    expect(console.error).toHaveBeenCalledWith("answers channel: CHANNEL_ERROR", reason);
  });
});