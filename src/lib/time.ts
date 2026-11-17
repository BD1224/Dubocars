// PURE time helpers. A day is a local "YYYY-MM-DD" string; a time within a day is minutes since local midnight.

export type DayKey = string;

export const STEP_MIN = 30;
export const DAY_START_MIN = 6 * 60; // 6:00 AM
export const DAY_END_MIN = 24 * 60; // midnight (end of day)
export const HOUR_PX = 64; // grid height of one hour

/** Today's DayKey in local time. */
export function todayKey(now: Date = new Date()): DayKey {
  return dayKeyOf(now);
}

/** DayKey (local) of any Date. */
export function dayKeyOf(date: Date): DayKey {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Shift a DayKey by n days (n may be negative). DST-safe. */
export function addDays(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split("-").map(Number);
  return dayKeyOf(new Date(y, m - 1, d + n));
}

/** Local Date at `minutes` past midnight of `day`. 1440 → next day's 00:00. */
export function atMinutes(day: DayKey, minutes: number): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 0, minutes);
}

/** Minutes since local midnight of `day` for an ISO string or Date (next midnight → 1440). */
export function minutesInDay(day: DayKey, time: string | Date): number {
  const date = new Date(time);
  const key = dayKeyOf(date);
  if (key < day) return 0;
  if (key > day) return 24 * 60;
  return date.getHours() * 60 + date.getMinutes();
}

/** Floor to the 30-min slot containing `minutes`, clamped to [DAY_START_MIN, DAY_END_MIN - STEP_MIN]. */
export function snapToSlot(minutes: number): number {
  const floored = Math.floor(minutes / STEP_MIN) * STEP_MIN;
  return Math.min(Math.max(floored, DAY_START_MIN), DAY_END_MIN - STEP_MIN);
}

/** All step-aligned minute values from `from` to `to`, inclusive. */
export function slotOptions(from: number, to: number): number[] {
  const out: number[] = [];
  for (let m = from; m <= to; m += STEP_MIN) out.push(m);
  return out;
}

/**
 * Change the start, keeping the duration when possible.
 * End is clamped to DAY_END_MIN and is always at least start + STEP_MIN.
 */
export function moveStart(start: number, end: number, newStart: number): { start: number; end: number } {
  const duration = end - start;
  const newEnd = Math.min(newStart + duration, DAY_END_MIN);
  return { start: newStart, end: Math.max(newEnd, newStart + STEP_MIN) };
}

/** "2:00 PM". 1440 → "12:00 AM". */
export function formatTime(minutes: number): string {
  const m = minutes % (24 * 60);
  const h12 = Math.floor(m / 60) % 12 || 12;
  return `${h12}:${String(m % 60).padStart(2, "0")} ${m < 12 * 60 ? "AM" : "PM"}`;
}

/** "2:00–4:30 PM" (shared AM/PM collapsed) or "11:30 AM–1:00 PM". */
export function formatRange(start: number, end: number): string {
  const a = formatTime(start);
  const b = formatTime(end);
  if (a.slice(-2) === b.slice(-2)) return `${a.slice(0, -3)}–${b}`;
  return `${a}–${b}`;
}

/** "Mon, Nov 16". */
export function formatDayTitle(day: DayKey): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Pixel offset from the top of the grid for a minute value. */
export function minutesToPx(minutes: number): number {
  return ((minutes - DAY_START_MIN) / 60) * HOUR_PX;
}

/** Minute value for a pixel offset from the top of the grid (not snapped). */
export function pxToMinutes(px: number): number {
  return (px / HOUR_PX) * 60 + DAY_START_MIN;
}
