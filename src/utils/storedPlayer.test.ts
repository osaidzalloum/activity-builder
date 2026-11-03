import { describe, expect, it } from "vitest";
import { parseStoredPlayer, serializeStoredPlayer } from "./storedPlayer";

const valid = { code: "HRWP5Q", name: "Amy", playerId: "7f3c2a10-aaaa-bbbb-cccc-123456789abc" };

describe("storedPlayer", () => {
  it("returns null when nothing is stored", () => {
    expect(parseStoredPlayer(null)).toBeNull();
  });

  it("returns null for text that is not JSON", () => {
    expect(parseStoredPlayer("{oops")).toBeNull();
  });

  it("returns null when a field is missing", () => {
    expect(parseStoredPlayer(JSON.stringify({ code: "HRWP5Q", name: "Amy" }))).toBeNull();
  });

  it("returns null for a code that is not 6 uppercase characters", () => {
    expect(parseStoredPlayer(JSON.stringify({ ...valid, code: "hrwp5q" }))).toBeNull();
    expect(parseStoredPlayer(JSON.stringify({ ...valid, code: "HRWP5" }))).toBeNull();
  });

  it("returns null for an empty or too long name", () => {
    expect(parseStoredPlayer(JSON.stringify({ ...valid, name: "   " }))).toBeNull();
    expect(parseStoredPlayer(JSON.stringify({ ...valid, name: "x".repeat(51) }))).toBeNull();
  });

  it("restores exactly what was saved", () => {
    expect(parseStoredPlayer(serializeStoredPlayer(valid))).toEqual(valid);
  });

  it("drops fields it does not know", () => {
    const raw = JSON.stringify({ ...valid, isHost: true });

    expect(parseStoredPlayer(raw)).toEqual(valid);
  });

  it("trims the stored name", () => {
    const raw = JSON.stringify({ ...valid, name: "  Amy  " });

    expect(parseStoredPlayer(raw)?.name).toBe("Amy");
  });

  it("restores the saved answer together with the player", () => {
    const withAnswer = { ...valid, answer: { index: 2, choice: 1 } };

    expect(parseStoredPlayer(serializeStoredPlayer(withAnswer))).toEqual(withAnswer);
  });

  it("still accepts a record saved before answers were stored", () => {
    expect(parseStoredPlayer(JSON.stringify(valid))).toEqual(valid);
  });

  it.each([
    ["a negative choice", { index: 0, choice: -1 }],
    ["a fractional index", { index: 1.5, choice: 0 }],
    ["a missing choice", { index: 0 }],
  ])("returns null for an answer with %s", (_label, answer) => {
    expect(parseStoredPlayer(JSON.stringify({ ...valid, answer }))).toBeNull();
  });
});