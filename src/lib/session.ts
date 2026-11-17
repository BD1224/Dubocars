// Who is logged in: localStorage persistence and name matching for the login screen.
import type { SessionUser, User } from "./types.ts";

const STORAGE_KEY = "dubocars.user";

/** Stored session, or null (also null on the server or on bad JSON). */
export function loadSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable (private mode etc.): session just won't persist
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Case-insensitive, trimmed exact match on name. Returns the user even if paused (caller decides). */
export function findUserByName(users: User[], input: string): User | null {
  const wanted = input.trim().toLowerCase();
  if (!wanted) return null;
  return users.find((u) => u.name.trim().toLowerCase() === wanted) ?? null;
}
