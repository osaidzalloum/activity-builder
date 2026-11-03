import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useOnNewPlayers from "./useOnNewPlayers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(initial: string[], wrapper?: typeof StrictMode) {
  const onNew = vi.fn();
  const view = renderHook(({ ids }) => useOnNewPlayers(ids, onNew, 300), {
    initialProps: { ids: initial },
    wrapper,
  });
  return { onNew, ...view };
}

describe("useOnNewPlayers", () => {
  it("calls back once, after the delay, when a player appears", () => {
    const { onNew, rerender } = setup([]);

    rerender({ ids: ["a"] });
    expect(onNew).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("does nothing when nobody new appears", () => {
    const { onNew, rerender } = setup([]);

    rerender({ ids: [] });
    act(() => vi.advanceTimersByTime(1000));

    expect(onNew).not.toHaveBeenCalled();
  });

  it("calls once for several players who join together", () => {
    const { onNew, rerender } = setup([]);

    rerender({ ids: ["a"] });
    act(() => vi.advanceTimersByTime(100));
    rerender({ ids: ["a", "b"] });
    act(() => vi.advanceTimersByTime(1000));

    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("still calls back when someone leaves during the delay", () => {
    const { onNew, rerender } = setup(["x"]);
    act(() => vi.advanceTimersByTime(1000));
    onNew.mockClear();

    rerender({ ids: ["x", "a"] });
    act(() => vi.advanceTimersByTime(100));
    rerender({ ids: ["a"] });
    act(() => vi.advanceTimersByTime(1000));

    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("does not call back when a player only leaves", () => {
    const { onNew, rerender } = setup(["a", "b"]);
    act(() => vi.advanceTimersByTime(1000));
    onNew.mockClear();

    rerender({ ids: ["a"] });
    act(() => vi.advanceTimersByTime(1000));

    expect(onNew).not.toHaveBeenCalled();
  });

  it("treats a player who left and came back as new", () => {
    const { onNew, rerender } = setup(["a"]);
    act(() => vi.advanceTimersByTime(1000));
    onNew.mockClear();

    rerender({ ids: [] });
    rerender({ ids: ["a"] });
    act(() => vi.advanceTimersByTime(1000));

    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("is not triggered by the order of the ids", () => {
    const { onNew, rerender } = setup(["a", "b"]);
    act(() => vi.advanceTimersByTime(1000));
    onNew.mockClear();

    rerender({ ids: ["b", "a"] });
    act(() => vi.advanceTimersByTime(1000));

    expect(onNew).not.toHaveBeenCalled();
  });

  it("calls only once under StrictMode", () => {
    const { onNew, rerender } = setup([], StrictMode);

    rerender({ ids: ["a"] });
    act(() => vi.advanceTimersByTime(1000));

    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("uses the latest callback", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ ids, cb }) => useOnNewPlayers(ids, cb, 300),
      { initialProps: { ids: [] as string[], cb: first } }
    );

    rerender({ ids: ["a"], cb: first });
    rerender({ ids: ["a"], cb: second });
    act(() => vi.advanceTimersByTime(300));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});