// Sticky translucent header: date title, prev/next day, Today, calendar button, save pill, avatar.
"use client";

import type { ReactNode } from "react";
import type { SaveStatus, SessionUser } from "@/lib/types";
import { formatDayTitle, todayKey } from "@/lib/time";
import type { DayKey } from "@/lib/time";

type Props = {
  day: DayKey;
  status: SaveStatus;
  user: SessionUser;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenCalendar: () => void;
  onOpenAccount: () => void;
};

const PILL_TEXT: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved ✓",
  error: "Couldn't save",
};

const iconBtn = "flex h-11 w-11 items-center justify-center text-accent active:opacity-50";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function Header({
  day,
  status,
  user,
  onPrev,
  onNext,
  onToday,
  onOpenCalendar,
  onOpenAccount,
}: Props) {
  const isToday = day === todayKey();
  return (
    <header className="glass sticky top-0 z-20 border-b border-separator px-4 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-[28px] font-bold tracking-tight">{formatDayTitle(day)}</h1>
        <div className="flex items-center">
          <span
            className={`mr-1 rounded-full bg-fill px-2.5 py-1 text-[13px] text-secondary transition-opacity duration-300 ${
              status === "idle" ? "opacity-0" : "opacity-100"
            }`}
            aria-live="polite"
          >
            {PILL_TEXT[status]}
          </span>
          <button type="button" className={iconBtn} onClick={onOpenCalendar} aria-label="Pick a date">
            <Icon>
              <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
              <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
            </Icon>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center active:opacity-50"
            onClick={onOpenAccount}
            aria-label={`Account: ${user.name}`}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-semibold text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between pb-1">
        <button type="button" className={iconBtn} onClick={onPrev} aria-label="Previous day">
          <Icon>
            <path d="M15 5l-7 7 7 7" />
          </Icon>
        </button>
        <button
          type="button"
          onClick={onToday}
          className={`min-h-[44px] rounded-full px-4 text-[17px] font-semibold text-accent transition-opacity active:opacity-50 ${
            isToday ? "opacity-40" : ""
          }`}
        >
          Today
        </button>
        <button type="button" className={iconBtn} onClick={onNext} aria-label="Next day">
          <Icon>
            <path d="M9 5l7 7-7 7" />
          </Icon>
        </button>
      </div>
    </header>
  );
}
