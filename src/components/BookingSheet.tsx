// Edit sheet for one booking. Auto-saves every change (no Save button). Read-only for non-owners.
"use client";

import { useEffect, useRef, useState } from "react";
import type { Booking, BookingPatch, Car, User } from "@/lib/types";
import { atMinutes, formatRange, formatTime, minutesInDay, moveStart, slotOptions, DAY_END_MIN } from "@/lib/time";
import type { DayKey } from "@/lib/time";
import Sheet from "./Sheet";

type Props = {
  booking: Booking | null; // null = closed
  day: DayKey;
  cars: Car[];
  owner: User | undefined;
  canEdit: boolean;
  onChange: (patch: BookingPatch) => void;
  onDelete: () => void;
  onClose: () => void;
};

const DURATIONS = [
  { label: "30m", min: 30 },
  { label: "1h", min: 60 },
  { label: "1.5h", min: 90 },
  { label: "2h", min: 120 },
  { label: "3h", min: 180 },
];
const NOTE_DEBOUNCE_MS = 600;
const CONFIRM_MS = 3000;
const FALLBACK_COLOR = "#8E8E93";

const selectClass =
  "h-11 w-full rounded-xl bg-fill px-3 text-[16px] text-label outline-none";

function Label({ children }: { children: string }) {
  return <div className="mb-1.5 px-1 text-[13px] text-secondary">{children}</div>;
}

export default function BookingSheet({ booking, day, cars, owner, canEdit, onChange, onDelete, onClose }: Props) {
  const [note, setNote] = useState(booking?.note ?? "");
  const [confirming, setConfirming] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNote = useRef<string | null>(null); // note text not yet sent
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  const color = owner?.color ?? FALLBACK_COLOR;
  const ownerName = owner?.name ?? "Unknown";
  const start = booking ? minutesInDay(day, booking.starts_at) : 0;
  const end = booking ? minutesInDay(day, booking.ends_at) : 0;
  const car = booking ? cars.find((c) => c.id === booking.car_id) : undefined;

  function patchTimes(s: number, e: number) {
    onChange({ starts_at: atMinutes(day, s).toISOString(), ends_at: atMinutes(day, e).toISOString() });
  }

  function sendNote(text: string) {
    onChange({ note: text.trim() === "" ? null : text });
  }

  function flushNote() {
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = null;
    if (pendingNote.current !== null) {
      sendNote(pendingNote.current);
      pendingNote.current = null;
    }
  }

  function handleNote(text: string) {
    setNote(text);
    pendingNote.current = text;
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(flushNote, NOTE_DEBOUNCE_MS);
  }

  function handleClose() {
    flushNote();
    onClose();
  }

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      confirmTimer.current = setTimeout(() => setConfirming(false), CONFIRM_MS);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    pendingNote.current = null;
    onDelete();
  }

  const colorDot = <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />;

  return (
    <Sheet open={booking !== null} onClose={handleClose} title={canEdit ? "Your booking" : "Booking"}>
      {booking && canEdit && (
        <div className="space-y-5 px-4 pb-6">
          <div className="flex items-center gap-2">
            {colorDot}
            <div className="min-w-0">
              <div className="truncate text-[17px] font-semibold text-label">{ownerName}</div>
              <div className="text-[15px] text-secondary">{formatRange(start, end)}</div>
            </div>
          </div>

          <div>
            <Label>Car</Label>
            <div className="flex gap-0.5 rounded-[10px] bg-fill p-0.5">
              {cars.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChange({ car_id: c.id })}
                  className={`h-9 min-w-0 flex-1 truncate rounded-[8px] px-2 text-[14px] font-medium text-label ${
                    c.id === booking.car_id ? "bg-surface shadow-sm" : ""
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Duration</Label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => {
                const fits = start + d.min <= DAY_END_MIN;
                const active = end - start === d.min;
                return (
                  <button
                    key={d.label}
                    type="button"
                    disabled={!fits}
                    onClick={() => patchTimes(start, Math.min(start + d.min, DAY_END_MIN))}
                    className={`h-9 flex-1 rounded-full text-[14px] font-medium disabled:opacity-30 ${
                      active ? "bg-accent text-white" : "bg-fill text-label"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <Label>Starts</Label>
              <select
                className={selectClass}
                value={start}
                onChange={(e) => {
                  const next = moveStart(start, end, Number(e.target.value));
                  patchTimes(next.start, next.end);
                }}
              >
                {slotOptions(360, 1410).map((m) => (
                  <option key={m} value={m}>
                    {formatTime(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <Label>Ends</Label>
              <select
                className={selectClass}
                value={end}
                onChange={(e) => patchTimes(start, Number(e.target.value))}
              >
                {slotOptions(start + 30, DAY_END_MIN).map((m) => (
                  <option key={m} value={m}>
                    {formatTime(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => handleNote(e.target.value)}
            placeholder="Add a note"
            rows={3}
            className="w-full resize-none rounded-xl bg-fill px-3 py-2.5 text-[16px] text-label outline-none placeholder:text-secondary"
          />

          <button
            type="button"
            onClick={handleDelete}
            className="h-11 w-full rounded-xl bg-fill text-[17px] font-medium text-danger"
          >
            {confirming ? "Tap again to delete" : "Delete booking"}
          </button>
        </div>
      )}

      {booking && !canEdit && (
        <div className="space-y-3 px-4 pb-6">
          <div className="flex items-center gap-2">
            {colorDot}
            <div className="truncate text-[17px] font-semibold text-label">{ownerName}</div>
          </div>
          <div className="text-[15px] text-label">{car?.name ?? "Unknown car"}</div>
          <div className="text-[15px] text-secondary">{formatRange(start, end)}</div>
          {booking.note && <div className="whitespace-pre-wrap text-[15px] text-label">{booking.note}</div>}
          <div className="pt-1 text-[13px] text-secondary">Only {ownerName} can change this booking.</div>
        </div>
      )}
    </Sheet>
  );
}
