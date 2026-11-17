// Shared data shapes. Field names match the Supabase columns exactly.

export type User = {
  id: string;
  name: string;
  color: string; // hex, e.g. "#0A84FF"
  paused: boolean;
};

/** What we keep in localStorage for the logged-in person. */
export type SessionUser = Pick<User, "id" | "name" | "color">;

export type Car = {
  id: string;
  name: string;
  sort_order: number;
};

export type Booking = {
  id: string;
  car_id: string;
  user_id: string;
  starts_at: string; // ISO timestamp
  ends_at: string; // ISO timestamp
  note: string | null;
};

/** Fields the owner can change from the edit sheet. */
export type BookingPatch = Partial<Pick<Booking, "car_id" | "starts_at" | "ends_at" | "note">>;

/** Drives the "Saving… / Saved ✓" pill in the header. */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** The subset of a Supabase realtime payload we use. */
export type BookingChange =
  | { eventType: "INSERT" | "UPDATE"; new: Booking }
  | { eventType: "DELETE"; old: { id: string } };
