import "server-only";
import { notFound, redirect } from "next/navigation";
import { TIMEZONE } from "./config";
import { getSession } from "./supabase/server";
import type { Booking, Profile } from "./types";

export async function requireAdmin() {
  const session = await getSession();
  if (!session.user) redirect("/login?next=/admin");
  if (!session.isAdmin) notFound();
  return session;
}

export function todayInBogota(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d); // YYYY-MM-DD
}

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function parseRange(desde?: string, hasta?: string) {
  const from = isDate(desde) ? desde! : todayInBogota();
  const to = isDate(hasta) ? hasta! : todayInBogota(14);
  return { from, to };
}

export type AdminBooking = Booking & { profile: Profile | null };

export async function loadBookings(
  supabase: Awaited<ReturnType<typeof getSession>>["supabase"],
  from: string,
  to: string,
  includeCancelled: boolean,
) {
  let query = supabase
    .from("bookings")
    .select("*")
    .gte("class_date", from)
    .lte("class_date", to)
    .order("starts_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(5000);
  if (!includeCancelled) query = query.neq("status", "cancelada");

  const { data: bookings, error } = await query;
  if (error) throw error;

  const ids = [...new Set((bookings ?? []).map((b) => b.user_id))];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, email, full_name, phone").in("id", ids)
    : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));

  return (bookings ?? []).map((b) => ({ ...(b as Booking), profile: byId.get(b.user_id) ?? null })) as AdminBooking[];
}
