import test from "node:test";
import assert from "node:assert/strict";
import { applyChange, isOnDay, layoutOverlaps, newBooking, removeBooking, upsertBooking } from "./bookings.ts";
import { atMinutes } from "./time.ts";
import type { Booking } from "./types.ts";

const DAY = "2026-11-16";
function mk(id: string, startMin: number, endMin: number, day = DAY): Booking {
  return {
    id, car_id: "c1", user_id: "u1", note: null,
    starts_at: atMinutes(day, startMin).toISOString(),
    ends_at: atMinutes(day, endMin).toISOString(),
  };
}

test("newBooking near midnight is cut off at midnight", () => {
  const b = newBooking({ carId: "c1", userId: "u1", day: DAY, startMin: 1425 });
  assert.equal(new Date(b.ends_at).getTime(), new Date(2026, 10, 17, 0, 0).getTime());
});

test("newBooking makes a 30-min booking with a fresh id", () => {
  const a = newBooking({ carId: "c1", userId: "u1", day: DAY, startMin: 840 });
  const b = newBooking({ carId: "c1", userId: "u1", day: DAY, startMin: 840 });
  assert.notEqual(a.id, b.id);
  assert.equal(a.car_id, "c1");
  assert.equal(a.user_id, "u1");
  assert.equal(a.note, null);
  assert.equal(new Date(a.starts_at).getTime(), new Date(2026, 10, 16, 14, 0).getTime());
  assert.equal(new Date(a.ends_at).getTime(), new Date(2026, 10, 16, 14, 30).getTime());
});

test("isOnDay", () => {
  assert.equal(isOnDay(mk("a", 600, 660), DAY), true);
  assert.equal(isOnDay(mk("a", 600, 660), "2026-11-17"), false);
  assert.equal(isOnDay(mk("a", 1380, 1440), DAY), true);
});

test("layoutOverlaps: no overlap", () => {
  const m = layoutOverlaps([mk("a", 600, 660), mk("b", 700, 760)]);
  assert.deepEqual(m.get("a"), { col: 0, cols: 1 });
  assert.deepEqual(m.get("b"), { col: 0, cols: 1 });
});

test("layoutOverlaps: touching edges do not overlap", () => {
  const m = layoutOverlaps([mk("a", 600, 660), mk("b", 660, 720)]);
  assert.deepEqual(m.get("a"), { col: 0, cols: 1 });
  assert.deepEqual(m.get("b"), { col: 0, cols: 1 });
});

test("layoutOverlaps: two overlapping", () => {
  const m = layoutOverlaps([mk("a", 600, 690), mk("b", 660, 720)]);
  assert.deepEqual(m.get("a"), { col: 0, cols: 2 });
  assert.deepEqual(m.get("b"), { col: 1, cols: 2 });
});

test("layoutOverlaps: chain A-B, B-C shares col 0 for A and C", () => {
  const m = layoutOverlaps([mk("c", 700, 780), mk("a", 600, 690), mk("b", 660, 720)]);
  assert.deepEqual(m.get("a"), { col: 0, cols: 2 });
  assert.deepEqual(m.get("b"), { col: 1, cols: 2 });
  assert.deepEqual(m.get("c"), { col: 0, cols: 2 });
});

test("layoutOverlaps: empty", () => {
  assert.equal(layoutOverlaps([]).size, 0);
});

test("upsert sorts and replaces; remove deletes", () => {
  const a = mk("a", 600, 660);
  const b = mk("b", 500, 560);
  let list = upsertBooking(upsertBooking([], a), b);
  assert.deepEqual(list.map((x) => x.id), ["b", "a"]);
  list = upsertBooking(list, { ...a, note: "hi" });
  assert.equal(list.length, 2);
  assert.equal(list.find((x) => x.id === "a")?.note, "hi");
  assert.deepEqual(removeBooking(list, "b").map((x) => x.id), ["a"]);
});

test("applyChange", () => {
  const a = mk("a", 600, 660);
  assert.deepEqual(applyChange([], { eventType: "INSERT", new: a }, DAY), [a]);
  assert.deepEqual(applyChange([], { eventType: "INSERT", new: mk("x", 600, 660, "2026-11-17") }, DAY), []);
  const moved = mk("a", 600, 660, "2026-11-17");
  assert.deepEqual(applyChange([a], { eventType: "UPDATE", new: moved }, DAY), []);
  const edited = { ...a, note: "n" };
  assert.deepEqual(applyChange([a], { eventType: "UPDATE", new: edited }, DAY), [edited]);
  assert.deepEqual(applyChange([a], { eventType: "DELETE", old: { id: "a" } }, DAY), []);
});
