import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays, atMinutes, dayKeyOf, formatDayTitle, formatRange, formatTime, minutesInDay,
  minutesToPx, moveStart, pxToMinutes, slotOptions, snapToSlot, todayKey,
} from "./time.ts";

test("dayKeyOf / todayKey use local date", () => {
  assert.equal(dayKeyOf(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(todayKey(new Date(2026, 10, 16, 0, 1)), "2026-11-16");
});

test("addDays across month, year and DST", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(addDays("2026-03-08", 1), "2026-03-09");
  assert.equal(addDays("2026-03-07", 2), "2026-03-09");
  assert.equal(addDays("2026-11-01", 1), "2026-11-02");
  assert.equal(addDays("2026-11-02", -1), "2026-11-01");
  assert.equal(addDays("2026-11-16", 0), "2026-11-16");
});

test("atMinutes", () => {
  assert.equal(atMinutes("2026-11-16", 870).getTime(), new Date(2026, 10, 16, 14, 30).getTime());
  assert.equal(atMinutes("2026-11-16", 1440).getTime(), new Date(2026, 10, 17, 0, 0).getTime());
  assert.equal(atMinutes("2026-12-31", 1440).getTime(), new Date(2027, 0, 1).getTime());
});

test("minutesInDay round-trips", () => {
  for (const day of ["2026-11-16", "2026-03-08", "2026-11-01"]) {
    for (const m of [0, 360, 870, 1410, 1440]) {
      assert.equal(minutesInDay(day, atMinutes(day, m)), m);
      assert.equal(minutesInDay(day, atMinutes(day, m).toISOString()), m);
    }
  }
});

test("snapToSlot floors and clamps", () => {
  assert.equal(snapToSlot(371), 360);
  assert.equal(snapToSlot(389), 360);
  assert.equal(snapToSlot(390), 390);
  assert.equal(snapToSlot(100), 360);
  assert.equal(snapToSlot(1439), 1410);
  assert.equal(snapToSlot(1440), 1410);
});

test("slotOptions inclusive", () => {
  assert.deepEqual(slotOptions(360, 450), [360, 390, 420, 450]);
});

test("moveStart keeps duration and clamps", () => {
  assert.deepEqual(moveStart(600, 690, 720), { start: 720, end: 810 });
  assert.deepEqual(moveStart(600, 780, 1380), { start: 1380, end: 1440 });
  assert.deepEqual(moveStart(600, 780, 1410), { start: 1410, end: 1440 });
});

test("formatTime", () => {
  assert.equal(formatTime(0), "12:00 AM");
  assert.equal(formatTime(720), "12:00 PM");
  assert.equal(formatTime(1440), "12:00 AM");
  assert.equal(formatTime(870), "2:30 PM");
  assert.equal(formatTime(360), "6:00 AM");
});

test("formatRange", () => {
  assert.equal(formatRange(840, 990), "2:00–4:30 PM");
  assert.equal(formatRange(690, 780), "11:30 AM–1:00 PM");
  assert.equal(formatRange(1380, 1440), "11:00 PM–12:00 AM");
});

test("formatDayTitle", () => {
  assert.equal(formatDayTitle("2026-11-16"), "Mon, Nov 16");
});

test("pixel math", () => {
  assert.equal(minutesToPx(360), 0);
  assert.equal(minutesToPx(420), 64);
  assert.equal(pxToMinutes(64), 420);
  assert.equal(pxToMinutes(minutesToPx(1440)), 1440);
});
