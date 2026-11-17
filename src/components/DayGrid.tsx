// The day view: one column per car, 6 AM–midnight. Tap an empty slot to create; swipe to change day.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";
import type { Booking, Car, User } from "@/lib/types";
import { layoutOverlaps } from "@/lib/bookings";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  formatTime,
  minutesToPx,
  pxToMinutes,
  snapToSlot,
  todayKey,
} from "@/lib/time";
import type { DayKey } from "@/lib/time";
import BookingBlock from "./BookingBlock";

type Props = {
  day: DayKey;
  cars: Car[];
  bookings: Booking[];
  usersById: Map<string, User>;
  onCreate: (carId: string, startMin: number) => void;
  onOpen: (bookingId: string) => void;
  onSwipe: (direction: 1 | -1) => void;
};

const GUTTER_PX = 52;
const HEADER_PX = 36;
const SWIPE_PX = 60;

const HOURS: number[] = [];
for (let h = DAY_START_MIN / 60; h <= DAY_END_MIN / 60; h++) HOURS.push(h);

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** One car's column: its bookings laid out side by side where they overlap. */
function CarColumn(props: {
  car: Car;
  day: DayKey;
  bookings: Booking[];
  usersById: Map<string, User>;
  onCreate: (carId: string, startMin: number) => void;
  onOpen: (bookingId: string) => void;
}) {
  const { car, day, bookings, usersById, onCreate, onOpen } = props;
  const placements = useMemo(() => layoutOverlaps(bookings), [bookings]);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    onCreate(car.id, snapToSlot(pxToMinutes(y)));
  }

  return (
    <div onClick={handleClick} className="relative h-full min-w-0 flex-1 border-l border-separator">
      {bookings.map((b) => {
        const placement = placements.get(b.id);
        if (!placement) return null;
        return (
          <BookingBlock
            key={b.id}
            booking={b}
            day={day}
            user={usersById.get(b.user_id)}
            placement={placement}
            onOpen={onOpen}
          />
        );
      })}
    </div>
  );
}

export default function DayGrid({ day, cars, bookings, usersById, onCreate, onOpen, onSwipe }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [now, setNow] = useState(nowMinutes);
  const isToday = day === todayKey();

  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  // On day change: today opens near now, other days at 8 AM.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = day === todayKey() ? Math.max(nowMinutes() - 60, DAY_START_MIN) : 8 * 60;
    el.scrollTop = minutesToPx(target);
  }, [day, cars.length === 0]);

  const byCar = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const list = map.get(b.car_id);
      if (list) list.push(b);
      else map.set(b.car_id, [b]);
    }
    return map;
  }, [bookings]);

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  }

  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) onSwipe(dx < 0 ? 1 : -1);
  }

  if (cars.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-[15px] text-secondary">
        No cars yet. Add them in Supabase.
      </div>
    );
  }

  const bodyHeight = minutesToPx(DAY_END_MIN);
  const showNow = isToday && now >= DAY_START_MIN && now <= DAY_END_MIN;

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 overflow-y-auto"
      style={{ touchAction: "pan-y" }}
    >
      {/* Sticky car names */}
      <div
        className="glass sticky top-0 z-20 flex border-b border-separator"
        style={{ height: HEADER_PX, paddingLeft: GUTTER_PX }}
      >
        {cars.map((car) => (
          <div
            key={car.id}
            className="flex min-w-0 flex-1 items-center justify-center px-1 text-[13px] font-semibold text-label"
          >
            <span className="truncate">{car.name}</span>
          </div>
        ))}
      </div>

      <div className="relative" style={{ height: bodyHeight + 16 }}>
        {/* Hour labels in the gutter */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute text-right text-[11px] leading-none text-secondary"
            style={{
              top: minutesToPx(h * 60),
              width: GUTTER_PX - 8,
              transform: h === DAY_START_MIN / 60 ? undefined : "translateY(-50%)",
            }}
          >
            {formatTime(h * 60).replace(":00", "")}
          </div>
        ))}

        {/* Hour and half-hour lines */}
        <div className="pointer-events-none absolute right-0" style={{ left: GUTTER_PX, height: bodyHeight }}>
          {HOURS.map((h) => (
            <div key={h}>
              <div className="absolute inset-x-0 border-t border-separator" style={{ top: minutesToPx(h * 60) }} />
              {h < DAY_END_MIN / 60 && (
                <div
                  className="absolute inset-x-0 border-t border-separator opacity-40"
                  style={{ top: minutesToPx(h * 60 + 30) }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Car columns */}
        <div className="absolute right-0 flex" style={{ left: GUTTER_PX, height: bodyHeight }}>
          {cars.map((car) => (
            <CarColumn
              key={car.id}
              car={car}
              day={day}
              bookings={byCar.get(car.id) ?? []}
              usersById={usersById}
              onCreate={onCreate}
              onOpen={onOpen}
            />
          ))}
        </div>

        {/* Now line */}
        {showNow && (
          <div
            className="pointer-events-none absolute right-0 z-10"
            style={{ left: GUTTER_PX - 4, top: minutesToPx(now) }}
          >
            <div className="absolute -top-[3.5px] left-0 h-[7px] w-[7px] rounded-full bg-danger" />
            <div className="h-[1.5px] -translate-y-1/2 bg-danger" />
          </div>
        )}
      </div>
    </div>
  );
}
