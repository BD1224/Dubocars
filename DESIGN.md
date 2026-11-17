# Dubocars — Design (owned by the lead)

Read `PREFERENCES.md` and `SPEC.md` (its "Decisions" section wins) first.

## Big picture
A single client-rendered page. There is no server code: the browser talks to Supabase directly
with the **publishable** key. Two screens, chosen by whether a user is stored in localStorage:

```
src/app/page.tsx ── no session ──> LoginScreen ──(onLogin)──┐
                 └─ session ────> CalendarScreen <──────────┘
```

## File map (what each file is for)
```
src/
  app/
    layout.tsx           HTML shell, viewport/theme-color metadata, globals.css
    page.tsx             Reads session from localStorage; renders LoginScreen or CalendarScreen
    globals.css          Tailwind import + iOS color tokens (light/dark) + sheet animation
  components/
    LoginScreen.tsx      "What's your name?" → matches against users → saves session
    CalendarScreen.tsx   Owns state: selected day, open sheets, users, cars. Wires everything together
    Header.tsx           Sticky blurred header: date title, ‹ ›, Today, calendar, save pill, avatar
    DayGrid.tsx          Car columns × 6AM–midnight. Tap empty slot → onCreate. Now line. Swipe days
    BookingBlock.tsx     One tinted booking rectangle (positioned by DayGrid)
    BookingSheet.tsx     Edit sheet (auto-save). Read-only when not the owner
    DatePickerSheet.tsx  Month grid + native date input
    Sheet.tsx            Generic bottom sheet (backdrop, blur, slide-up animation)
  hooks/
    useBookings.ts       Bookings for one day: fetch + realtime + optimistic create/update/remove + save status
  lib/
    types.ts             User, Car, Booking, BookingPatch, SaveStatus
    time.ts              PURE. Day keys, minutes-in-day math, snapping, formatting, pixel math
    bookings.ts          PURE. New booking factory, overlap layout, applying realtime changes
    session.ts           localStorage session + name matching for login
    supabase.ts          The one Supabase client
    api.ts               Every Supabase call lives here (thin, throws on error)
  lib/*.test.ts          Unit tests for the pure files (node:test)
supabase/schema.sql      Paste into the Supabase SQL editor
```

## Key decisions
- **Day = `DayKey` string `"YYYY-MM-DD"` in local time.** No Date objects in React state.
- **Time inside a day = minutes since local midnight** (360 = 6:00 AM, 1440 = midnight end).
  Converted to ISO `timestamptz` only at the edges (`atMinutes`, `minutesInDay`).
- **Constants:** step 30 min, visible 6:00–24:00, `HOUR_PX = 64`.
- **Booking ids are made on the client** (`crypto.randomUUID()`). Optimistic insert and the realtime
  echo of the same row are then the same id → upsert is idempotent. No temp-id bookkeeping.
- **Lowest-friction create:** tapping an empty slot *immediately inserts* a 30-min booking for me
  and opens the sheet. If I do nothing, it's already saved. The sheet has quick duration chips
  (30m, 1h, 2h, 3h) plus start/end pickers, car picker, note, Delete.
- **Auto-save:** car/start/end save on change; note saves debounced (~600 ms) and on close.
  `useBookings` exposes `status: 'idle'|'saving'|'saved'|'error'` → header pill.
  On a failed write: refetch the day (server is truth) and show "Couldn't save".
- **Realtime:** one channel on `bookings` (`*` events). `applyChange` (pure) upserts/removes
  depending on whether the row is on the selected day.
- **Overlaps allowed:** `layoutOverlaps` groups transitively overlapping bookings per car into
  clusters and gives each a column index; width = 1/cols (Google Calendar style).
- **Login:** fetch all users (tiny table) and match `trim().toLowerCase()` in JS — no ilike escaping.
  On calendar load, if my user is now paused/missing, log out.
- **Ownership** is enforced in the UI only (as the spec allows).
- **Styling:** Tailwind v4 + CSS variables for iOS system colors with a `prefers-color-scheme: dark` override.
  Booking block: `color-mix(in srgb, <userColor> 20%, transparent)` background, 3px solid left bar.
  Sheet animation: CSS transform with the iOS curve `cubic-bezier(0.32, 0.72, 0, 1)`. No animation library.

## Import rule (so tests run without installs)
Inside `src/lib/`, relative runtime imports use the `.ts` extension (`import { x } from "./time.ts"`),
and type-only imports use `import type`. Everything else uses the `@/` alias (`@/lib/time`).
This lets `node --test` run lib tests directly with Node 24's built-in TypeScript support.

## Rules adopted from the design review (implementers MUST follow)
1. **Write queue.** `useBookings` runs every Supabase write through one promise chain
   (`queueRef.current = queueRef.current.then(op)`) so an update can never reach the server before
   its insert. `status` is "saving" while the queue has pending work, "saved" when it drains, "error" on failure
   (then refetch the day).
2. **Pending patches survive realtime echoes.** `useBookings` keeps `pendingRef: Map<id, BookingPatch>` of
   writes not yet confirmed; incoming realtime rows / refetches are applied as `{...row, ...pending.get(id)}`.
   Entry is cleared when that write resolves.
3. **Sheet is keyed per booking.** CalendarScreen renders `<BookingSheet key={booking.id}>` and binds the id
   in its `onChange`. The sheet keeps the note in local state (initialized once from props), debounces it
   600 ms, and flushes it in its close handler (not in an effect cleanup). Blank note → `null`.
   Show "Saving…" as soon as a note edit starts (call onChange per debounce; acceptable).
4. **Fetch/subscribe hygiene.** Ignore fetch results for a day that's no longer selected. Subscribe once
   (not per day) using a ref for the current day; channel topic `bookings-${crypto.randomUUID()}`;
   `supabase.removeChannel(channel)` on cleanup. Refetch on `SUBSCRIBED` and on `visibilitychange` → visible.
5. **No hydration mismatch.** `page.tsx` loads the session in `useEffect` and renders nothing until loaded.
6. **iOS inputs.** Time pickers are `<select>`s fed by `slotOptions`. All inputs/selects use ≥16px text.
7. **Grid gestures.** Grid has `touch-action: pan-y`; swipe = horizontal move > 60px and > vertical move.
   Create bookings from `onClick` on the column; tap y comes from the column's `getBoundingClientRect()`.
   `minutesToPx(360) === 0`: the grid top is 6:00 AM. Today opens scrolled near now; other days near 8 AM.

## Shared styling tokens (defined in src/app/globals.css; use these, don't invent new colors)
Tailwind color utilities: `bg-bg`, `bg-surface`, `bg-fill`, `text-label`, `text-secondary`, `border-separator`,
`bg-accent`/`text-accent` (#0A84FF), `bg-danger`/`text-danger` (red, "now" line + Delete).
`.glass` = translucent blurred surface (header, sheets). Sheet panel animation: `.sheet-panel` with
`data-open="true|false"`; backdrop `.sheet-backdrop` same attribute.
