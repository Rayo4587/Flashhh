import Link from "next/link";
import { redirect } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/format";
import { getSession } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Mis reservas" };

export default async function MisReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const { supabase, user } = await getSession();
  if (!user) redirect("/login?next=/mis-reservas");

  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", user.id)
    .order("starts_at", { ascending: false })
    .limit(100);

  const bookings = (data ?? []) as Booking[];
  const now = Date.now();
  const upcoming = bookings.filter((b) => new Date(b.starts_at).getTime() >= now).reverse();
  const past = bookings.filter((b) => new Date(b.starts_at).getTime() < now);

  const row = (b: Booking) => (
    <Link
      key={b.id}
      href={`/reserva/${b.id}`}
      className="card flex items-center justify-between gap-3 transition hover:border-sand-500"
    >
      <div>
        <p className="font-semibold">{b.class_name}</p>
        <p className="text-sm text-sand-700">{formatDateTime(b.starts_at)}</p>
        {b.location && <p className="text-xs text-sand-700">{b.location}</p>}
      </div>
      <StatusBadge status={b.status} />
    </Link>
  );

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl">Mis reservas</h1>
      {ok === "cancelada" && <p className="rounded-xl bg-sand-100 p-4 text-sm">Tu reserva fue cancelada.</p>}
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sand-700">Próximas</h2>
        {upcoming.length ? upcoming.map(row) : (
          <div className="card text-sm text-sand-700">
            No tienes reservas próximas. <Link href="/" className="underline">Ver agenda</Link>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sand-700">Historial</h2>
          {past.map(row)}
        </section>
      )}
    </div>
  );
}
