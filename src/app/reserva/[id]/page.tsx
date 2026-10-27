import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelarReserva } from "@/app/mis-reservas/actions";
import Policies from "@/components/Policies";
import StatusBadge from "@/components/StatusBadge";
import { CANCEL_HOURS } from "@/lib/config";
import { formatCOP, formatDateTime } from "@/lib/format";
import { getSession } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Tu reserva" };

export default async function ReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nueva?: string; error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { nueva, error, ok } = await searchParams;
  const { supabase, user } = await getSession();
  if (!user) redirect(`/login?next=/reserva/${id}`);

  const { data } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const b = data as Booking;

  const canCancel =
    b.status !== "cancelada" &&
    new Date(b.starts_at).getTime() - Date.now() >= CANCEL_HOURS * 3600_000;
  const price = formatCOP(b.price_cop);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {nueva && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          ¡Listo! Tu cupo está reservado. Te enviamos un correo de confirmación a <strong>{user.email}</strong>.
        </div>
      )}
      {ok === "cancelada" && (
        <div className="rounded-2xl bg-sand-100 p-4 text-sm">Tu reserva fue cancelada.</div>
      )}
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl">{b.class_name}</h1>
            <p className="text-sand-700">{formatDateTime(b.starts_at)}</p>
            {b.location && <p className="text-sm text-sand-700">{b.location}</p>}
          </div>
          <StatusBadge status={b.status} />
        </div>
        {price && <p className="text-sm">Valor: <strong>{price}</strong></p>}

        {b.status === "pendiente_pago" && b.payment_url && (
          <div className="rounded-xl bg-sand-100 p-4">
            <p className="mb-3 text-sm">Completa tu pago para confirmar tu cupo:</p>
            <a href={b.payment_url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
              Pagar con Mercado Pago
            </a>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/mis-reservas" className="btn-ghost">Mis reservas</Link>
          {canCancel && (
            <form action={cancelarReserva}>
              <input type="hidden" name="booking_id" value={b.id} />
              <input type="hidden" name="back" value={`/reserva/${b.id}`} />
              <button className="btn-ghost text-red-700">Cancelar reserva</button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-serif text-lg">Políticas</h2>
        <Policies />
      </div>
    </div>
  );
}
