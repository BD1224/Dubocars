// PURE booking logic: creating a new booking, side-by-side overlap layout, applying realtime changes.
import type { Booking, BookingChange } from "./types.ts";
import { atMinutes, dayKeyOf, STEP_MIN } from "./time.ts";
import type { DayKey } from "./time.ts";

/** A booking's horizontal slot inside its car column: column `col` of `cols`. */
export type Placement = { col: number; cols: number };

/** A new STEP_MIN-long booking with a client-generated id. */
export function newBooking(args: { carId: string; userId: string; day: DayKey; startMin: number }): Booking {
  return {
    id: crypto.randomUUID(),
    car_id: args.carId,
    user_id: args.userId,
    starts_at: atMinutes(args.day, args.startMin).toISOString(),
    ends_at: atMinutes(args.day, args.startMin + STEP_MIN).toISOString(),
    note: null,
  };
}

/** True if the booking starts on `day` (bookings are single-day). */
export function isOnDay(booking: Booking, day: DayKey): boolean {
  return dayKeyOf(new Date(booking.starts_at)) === day;
}

/**
 * Google-Calendar-style layout for ONE car's bookings.
 * Bookings that overlap (transitively) form a cluster; each gets the lowest free column,
 * and every booking in the cluster shares the cluster's column count.
 * Touching edges (a.end == b.start) do not overlap.
 */
export function layoutOverlaps(bookings: Booking[]): Map<string, Placement> {
  const items = bookings
    .map((b) => ({ id: b.id, start: Date.parse(b.starts_at), end: Date.parse(b.ends_at) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const result = new Map<string, Placement>();
  let cluster: { id: string; col: number }[] = [];
  let colEnds: number[] = []; // end time of the last booking in each column
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const c of cluster) result.set(c.id, { col: c.col, cols: colEnds.length });
    cluster = [];
    colEnds = [];
  };
  for (const item of items) {
    if (item.start >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= item.start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = item.end;
    cluster.push({ id: item.id, col });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return result;
}

/** Insert or replace by id; result sorted by starts_at. */
export function upsertBooking(list: Booking[], booking: Booking): Booking[] {
  const rest = list.filter((b) => b.id !== booking.id);
  return [...rest, booking].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

/** Remove by id. */
export function removeBooking(list: Booking[], id: string): Booking[] {
  return list.filter((b) => b.id !== id);
}

/** Apply a realtime change to the list shown for `day` (rows moved to another day are removed). */
export function applyChange(list: Booking[], change: BookingChange, day: DayKey): Booking[] {
  if (change.eventType === "DELETE") return removeBooking(list, change.old.id);
  if (!isOnDay(change.new, day)) return removeBooking(list, change.new.id);
  return upsertBooking(list, change.new);
}
