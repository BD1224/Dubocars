// One booking rectangle: soft tint of the user's color, solid left bar, "Ben · 2:00–4:30 PM".
"use client";

import type { Booking, User } from "@/lib/types";
import type { Placement } from "@/lib/bookings";
import { formatRange, minutesInDay, minutesToPx } from "@/lib/time";
import type { DayKey } from "@/lib/time";

type Props = {
  booking: Booking;
  day: DayKey;
  user: User | undefined; // undefined if the user row is missing
  placement: Placement;
  onOpen: (bookingId: string) => void;
};

const FALLBACK_COLOR = "#8E8E93";

export default function BookingBlock({ booking, day, user, placement, onOpen }: Props) {
  const color = user?.color ?? FALLBACK_COLOR;
  const name = user?.name ?? "Unknown";
  const start = minutesInDay(day, booking.starts_at);
  const end = minutesInDay(day, booking.ends_at);
  const top = minutesToPx(start);
  const height = Math.max(minutesToPx(end) - top - 2, 4);
  const range = formatRange(start, end);
  const short = end - start <= 30; // one line: "Ben · 2:00–2:30 PM"
  const tiny = end - start <= 15; // 15-min blocks are ~14px tall: no vertical padding
  const { col, cols } = placement;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(booking.id);
      }}
      className={`block-in absolute overflow-hidden rounded-[10px] px-2 text-left text-[12px] leading-tight text-label ${tiny ? "py-0 text-[11px] leading-[14px]" : "py-1"}`}
      style={{
        top,
        height,
        left: `calc(${(col / cols) * 100}% + 2px)`,
        width: `calc(${100 / cols}% - 4px)`,
        background: `color-mix(in srgb, ${color} 20%, transparent)`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      {short ? (
        <div className="truncate">
          <span className="font-semibold">{name}</span> · {range}
        </div>
      ) : (
        <>
          <div className="truncate font-semibold">{name}</div>
          <div className="truncate">{range}</div>
          {/* Note preview: only blocks of 1h+ have room for a third line. */}
          {booking.note && end - start >= 60 && <div className="truncate opacity-70">{booking.note}</div>}
        </>
      )}
    </button>
  );
}
