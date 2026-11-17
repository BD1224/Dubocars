// Main screen. Owns: selected day, which sheet is open, users and cars. Wires Header + DayGrid + sheets.
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Car, SessionUser, User } from "@/lib/types";
import { fetchCars, fetchUsers } from "@/lib/api";
import { newBooking } from "@/lib/bookings";
import { addDays, todayKey } from "@/lib/time";
import { useBookings } from "@/hooks/useBookings";
import Header from "./Header";
import DayGrid from "./DayGrid";
import BookingSheet from "./BookingSheet";
import DatePickerSheet from "./DatePickerSheet";
import Sheet from "./Sheet";

type Props = {
  user: SessionUser;
  onLogout: () => void;
};

export default function CalendarScreen({ user, onLogout }: Props) {
  const [day, setDay] = useState(todayKey);
  const [users, setUsers] = useState<User[] | null>(null);
  const [cars, setCars] = useState<Car[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { bookings, status, create, update, remove } = useBookings(day);

  // Users and cars: fetched once (and again on Retry).
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    Promise.all([fetchUsers(), fetchCars()])
      .then(([u, c]) => {
        if (cancelled) return;
        setUsers(u);
        setCars(c);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const usersById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);

  // If I was removed or paused, go back to login.
  useEffect(() => {
    if (!users) return;
    const me = users.find((u) => u.id === user.id);
    if (!me || me.paused) onLogout();
  }, [users, user.id, onLogout]);

  const sheetOpen = openId !== null || calendarOpen || accountOpen;

  // Arrow keys change the day when no sheet is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sheetOpen) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = e.target;
      if (el instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
      setDay((d) => addDays(d, e.key === "ArrowRight" ? 1 : -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  function handleCreate(carId: string, startMin: number) {
    const b = newBooking({ carId, userId: user.id, day, startMin });
    create(b);
    setOpenId(b.id);
  }

  const open = bookings.find((b) => b.id === openId) ?? null;

  return (
    <div className="mx-auto flex h-dvh max-w-[900px] flex-col bg-bg">
      <Header
        day={day}
        status={status}
        user={user}
        onPrev={() => setDay((d) => addDays(d, -1))}
        onNext={() => setDay((d) => addDays(d, 1))}
        onToday={() => setDay(todayKey())}
        onOpenCalendar={() => setCalendarOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      {loadError && (
        <div className="flex items-center justify-between gap-3 bg-surface px-4 py-2 text-[14px] text-secondary">
          <span>Couldn&apos;t load cars and people.</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-medium text-accent">
            Retry
          </button>
        </div>
      )}

      {cars ? (
        <DayGrid
          day={day}
          cars={cars}
          bookings={bookings}
          usersById={usersById}
          onCreate={handleCreate}
          onOpen={setOpenId}
          onSwipe={(dir) => setDay((d) => addDays(d, dir))}
        />
      ) : (
        <div className="flex-1" />
      )}

      {open && (
        <BookingSheet
          key={open.id}
          booking={open}
          day={day}
          cars={cars ?? []}
          owner={usersById.get(open.user_id)}
          canEdit={open.user_id === user.id}
          onChange={(p) => update(open.id, p)}
          onDelete={() => {
            remove(open.id);
            setOpenId(null);
          }}
          onClose={() => setOpenId(null)}
        />
      )}

      <DatePickerSheet
        open={calendarOpen}
        day={day}
        onPick={(d) => {
          setDay(d);
          setCalendarOpen(false);
        }}
        onClose={() => setCalendarOpen(false)}
      />

      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title="Account">
        <div className="flex flex-col items-center gap-3 px-4 pb-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-[26px] font-semibold text-white"
            style={{ background: user.color }}
          >
            {user.name.trim().charAt(0).toUpperCase()}
          </div>
          <div className="text-[17px] text-label">Signed in as {user.name}</div>
          <button
            type="button"
            onClick={onLogout}
            className="h-11 w-full rounded-xl bg-fill text-[17px] font-medium text-accent"
          >
            Not you? Switch
          </button>
        </div>
      </Sheet>
    </div>
  );
}
