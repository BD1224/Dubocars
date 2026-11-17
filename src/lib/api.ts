// Every Supabase call in the app. Thin wrappers: they throw on error and return plain data.
import { supabase } from "./supabase.ts";
import type { Booking, BookingChange, BookingPatch, Car, User } from "./types.ts";
import { addDays, atMinutes } from "./time.ts";
import type { DayKey } from "./time.ts";

/** All users (including paused, so past bookings can still show names/colors). */
export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("users").select("id,name,color,paused");
  if (error) throw error;
  return (data ?? []) as User[];
}

/** Active (not paused) cars ordered by sort_order. */
export async function fetchCars(): Promise<Car[]> {
  const { data, error } = await supabase
    .from("cars")
    .select("id,name,sort_order")
    .eq("paused", false)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Car[];
}

/** Bookings starting on `day` (local), ordered by starts_at. */
export async function fetchBookings(day: DayKey): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id,car_id,user_id,starts_at,ends_at,note")
    .gte("starts_at", atMinutes(day, 0).toISOString())
    .lt("starts_at", atMinutes(addDays(day, 1), 0).toISOString())
    .order("starts_at");
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function insertBooking(booking: Booking): Promise<void> {
  const { error } = await supabase.from("bookings").insert(booking);
  if (error) throw error;
}

export async function updateBooking(id: string, patch: BookingPatch): Promise<void> {
  const { error } = await supabase.from("bookings").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Subscribe to all booking changes. Returns an unsubscribe function.
 * `onSubscribed` fires each time the channel (re)connects, so callers can refetch what they missed.
 */
export function subscribeToBookings(
  onChange: (change: BookingChange) => void,
  onSubscribed?: () => void,
): () => void {
  const channel = supabase
    .channel(`bookings-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
      if (payload.eventType === "DELETE") {
        onChange({ eventType: "DELETE", old: { id: String(payload.old.id) } });
      } else {
        onChange({ eventType: payload.eventType, new: payload.new as Booking });
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onSubscribed?.();
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
