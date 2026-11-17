// Bottom sheet with a month grid and a typed date input. Picking a date closes the sheet.
"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/Sheet";
import { dayKeyOf, todayKey } from "@/lib/time";
import type { DayKey } from "@/lib/time";

type Props = {
  open: boolean;
  day: DayKey;
  onPick: (day: DayKey) => void;
  onClose: () => void;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** First day of the month containing `day`, as a Date. */
function monthOf(day: DayKey): Date {
  const [y, m] = day.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export default function DatePickerSheet({ open, day, onPick, onClose }: Props) {
  const [month, setMonth] = useState<Date>(() => monthOf(day));

  // Each time the sheet opens, show the selected day's month.
  useEffect(() => {
    if (open) setMonth(monthOf(day));
  }, [open, day]);

  const year = month.getFullYear();
  const m = month.getMonth();
  const leading = month.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = todayKey();
  const cells: (DayKey | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKeyOf(new Date(year, m, i + 1))),
  ];
  const shift = (n: number) => setMonth(new Date(year, m + n, 1));
  const arrow = "flex h-11 w-11 items-center justify-center text-accent active:opacity-50";

  return (
    <Sheet open={open} onClose={onClose} title="Go to date">
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <button type="button" className={arrow} onClick={() => shift(-1)} aria-label="Previous month">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="text-[17px] font-semibold">
            {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button type="button" className={arrow} onClick={() => shift(1)} aria-label="Next month">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="py-1 text-[13px] font-medium text-secondary">
              {w}
            </div>
          ))}
          {cells.map((key, i) =>
            key === null ? (
              <div key={`blank-${i}`} />
            ) : (
              <button
                key={key}
                type="button"
                onClick={() => onPick(key)}
                className="flex h-11 items-center justify-center"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[17px] ${
                    key === day
                      ? "bg-accent font-semibold text-white"
                      : key === today
                        ? "font-semibold text-accent"
                        : ""
                  }`}
                >
                  {Number(key.slice(8))}
                </span>
              </button>
            ),
          )}
        </div>
        <input
          type="date"
          value={day}
          onChange={(e) => {
            if (e.target.value) onPick(e.target.value);
          }}
          aria-label="Pick any date"
          className="mt-3 h-11 w-full rounded-[12px] bg-fill px-3 text-[16px] outline-none"
        />
      </div>
    </Sheet>
  );
}
