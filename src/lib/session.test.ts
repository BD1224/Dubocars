import test from "node:test";
import assert from "node:assert/strict";
import { findUserByName } from "./session.ts";
import type { User } from "./types.ts";

const users: User[] = [
  { id: "1", name: "Ben", color: "#0A84FF", paused: false },
  { id: "2", name: "Dana Cohen", color: "#30D158", paused: true },
];

test("findUserByName ignores case and surrounding whitespace", () => {
  assert.equal(findUserByName(users, "  bEN ")?.id, "1");
  assert.equal(findUserByName(users, "dana cohen")?.id, "2"); // paused still returned
});

test("findUserByName requires exact match", () => {
  assert.equal(findUserByName(users, "Dana"), null);
  assert.equal(findUserByName(users, ""), null);
  assert.equal(findUserByName(users, "   "), null);
});
