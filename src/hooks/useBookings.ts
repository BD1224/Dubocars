// Bookings for the selected day: initial fetch, realtime updates, optimistic writes, save status.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteBooking, fetchBookings, insertBooking, subscribeToBookings, updateBooking } from "@/lib/api";
import { applyChange, removeBooking, upsertBooking } from "@/lib/bookings";
import type { Booking, BookingPatch, SaveStatus } from "@/lib/types";
import type { DayKey } from "@/lib/time";

export type UseBookings = {
  bookings: Booking[];
  status: SaveStatus;
  /** Optimistically add, then insert. */
  create: (booking: Booking) => void;
  /** Optimistically patch, then update. */
  update: (id: string, patch: BookingPatch) => void;
  /** Optimistically remove, then delete. */
  remove: (id: string) => void;
};

export function useBookings(day: DayKey): UseBookings {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const dayRef = useRef(day); // lets the one-time subscription see the current day
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const inflightRef = useRef(0);
  const failedRef = useRef(false);
  // Writes the server has not confirmed yet. Merged over every incoming row so a realtime echo
  // or refetch of older data cannot visually undo an optimistic edit.
  const pendingRef = useRef<Map<string, BookingPatch>>(new Map());

  const withPending = useCallback((row: Booking): Booking => ({ ...row, ...pendingRef.current.get(row.id) }), []);

  const load = useCallback(() => {
    const requested = dayRef.current;
    fetchBookings(requested)
      .then((rows) => {
        if (dayRef.current !== requested) return; // user already moved to another day
        setBookings((prev) => {
          const merged = rows.map(withPending);
          // Keep optimistic creates the server has not seen yet.
          const unsaved = prev.filter((b) => pendingRef.current.has(b.id) && !rows.some((r) => r.id === b.id));
          return unsaved.reduce(upsertBooking, merged);
        });
      })
      .catch(() => setStatus("error"));
  }, [withPending]);

  // One queue for all writes: an update must never reach the server before its insert.
  const enqueue = useCallback(
    (id: string, op: () => Promise<void>) => {
      if (inflightRef.current === 0) failedRef.current = false;
      inflightRef.current += 1;
      setStatus("saving");
      queueRef.current = queueRef.current
        .then(op)
        .catch(() => {
          failedRef.current = true;
          pendingRef.current.delete(id);
          setStatus("error");
          load(); // roll back to server truth
        })
        .then(() => {
          inflightRef.current -= 1;
          if (inflightRef.current > 0) return;
          pendingRef.current.clear(); // queue drained: everything is confirmed
          if (!failedRef.current) setStatus("saved");
        });
    },
    [load],
  );

  // "Saved ✓" is a brief confirmation, then the pill hides.
  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    return () => clearTimeout(t);
  }, [status]);

  // Day changed: remember it and fetch.
  useEffect(() => {
    dayRef.current = day;
    load();
  }, [day, load]);

  // Subscribe once; reconnects and returning to the tab refetch to catch anything missed.
  useEffect(() => {
    const onChange = (change: Parameters<typeof applyChange>[1]) => {
      const incoming = change.eventType === "DELETE" ? change : { ...change, new: withPending(change.new) };
      setBookings((prev) => applyChange(prev, incoming, dayRef.current));
    };
    const unsubscribe = subscribeToBookings(onChange, load);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
    };
  }, [load, withPending]);

  const create = useCallback(
    (booking: Booking) => {
      pendingRef.current.set(booking.id, booking);
      setBookings((prev) => upsertBooking(prev, booking));
      enqueue(booking.id, () => insertBooking(booking));
    },
    [enqueue],
  );

  const update = useCallback(
    (id: string, patch: BookingPatch) => {
      pendingRef.current.set(id, { ...pendingRef.current.get(id), ...patch });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
      enqueue(id, () => updateBooking(id, patch));
    },
    [enqueue],
  );

  const remove = useCallback(
    (id: string) => {
      pendingRef.current.delete(id);
      setBookings((prev) => removeBooking(prev, id));
      enqueue(id, () => deleteBooking(id));
    },
    [enqueue],
  );

  return { bookings, status, create, update, remove };
}
