import Link from "next/link";
import { cancelarComoAdmin, marcarPago } from "./actions";
import StatusBadge from "@/components/StatusBadge";
import { loadBookings, parseRange, requireAdmin, type AdminBooking } from "@/lib/admin";
import { MAX_CAPACITY } from "@/lib/config";
import { formatDay, formatTime } from "@/lib/format";

export const metadata = { title: "Panel de reservas" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; canceladas?: string; q?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { from, to } = parseRange(sp.desde, sp.hasta);
  const includeCancelled = sp.canceladas === "1";
  const q = (sp.q ?? "").trim().toLowerCase();

  let bookings = await loadBookings(supabase, from, to, includeCancelled);
  if (q) {
    bookings = bookings.filter((b) =>
      [b.profile?.full_name, b.profile?.email, b.profile?.phone, b.class_name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }

  const sessions = new Map<string, AdminBooking[]>();
  for (const b of bookings) {
    const key = `${b.starts_at}|${b.class_name}|${b.location ?? ""}`;
    sessions.set(key, [...(sessions.get(key) ?? []), b]);
  }

  const active = bookings.filter((b) => b.status !== "cancelada");
  const paid = active.filter((b) => b.status === "pagada").length;

  const params = new URLSearchParams({ desde: from, hasta: to });
  if (includeCancelled) params.set("canceladas", "1");
  if (q) params.set("q", q);
  const backUrl = `/admin?${params}`;

  let lastDay = "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Panel de reservas</h1>
          <p className="text-sm text-sand-700">Quién reservó, para qué clase y fecha.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/clases" className="btn-ghost">Clases y horarios</Link>
          <a href={`/admin/exportar?${params}`} className="btn-ghost">Descargar Excel (CSV)</a>
        </div>
      </div>

      {sp.error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{sp.error}</p>}

      <form className="card grid gap-3 sm:grid-cols-5 sm:items-end">
        <div>
          <label className="label" htmlFor="desde">Desde</label>
          <input id="desde" type="date" name="desde" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="hasta">Hasta</label>
          <input id="hasta" type="date" name="hasta" defaultValue={to} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={q} placeholder="Nombre, correo, celular" className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="canceladas" value="1" defaultChecked={includeCancelled} /> Ver canceladas
        </label>
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="card"><p className="text-2xl font-semibold">{active.length}</p><p className="text-xs text-sand-700">Reservas activas</p></div>
        <div className="card"><p className="text-2xl font-semibold">{paid}</p><p className="text-xs text-sand-700">Pagadas</p></div>
        <div className="card"><p className="text-2xl font-semibold">{active.length - paid}</p><p className="text-xs text-sand-700">Pendientes de pago</p></div>
      </div>

      {sessions.size === 0 && <div className="card text-center text-sand-700">No hay reservas en este rango.</div>}

      {[...sessions.entries()].map(([key, list]) => {
        const first = list[0];
        const day = formatDay(first.starts_at);
        const showDay = day !== lastDay;
        lastDay = day;
        const count = list.filter((b) => b.status !== "cancelada").length;
        return (
          <section key={key} className="space-y-2">
            {showDay && <h2 className="pt-4 text-sm font-semibold uppercase tracking-wide text-sand-700">{day}</h2>}
            <div className="card overflow-x-auto p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 px-5 py-3">
                <p className="font-semibold">
                  {formatTime(first.starts_at)} · {first.class_name}
                  {first.location && <span className="font-normal text-sand-700"> · {first.location}</span>}
                </p>
                <span className={`text-sm font-semibold ${count >= MAX_CAPACITY ? "text-red-700" : "text-olive-600"}`}>
                  {count}/{MAX_CAPACITY}
                </span>
              </div>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-sand-700">
                  <tr>
                    <th className="px-5 py-2">#</th>
                    <th className="px-2 py-2">Nombre</th>
                    <th className="px-2 py-2">Contacto</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-5 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b, i) => (
                    <tr key={b.id} className="border-t border-sand-100">
                      <td className="px-5 py-2 text-sand-700">{i + 1}</td>
                      <td className="px-2 py-2 font-medium">{b.profile?.full_name ?? "—"}</td>
                      <td className="px-2 py-2">
                        <div>{b.profile?.email}</div>
                        {b.profile?.phone && (
                          <a
                            className="text-olive-700 underline"
                            href={`https://wa.me/${b.profile.phone.replace(/\D/g, "").replace(/^(3\d{9})$/, "57$1")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {b.profile.phone}
                          </a>
                        )}
                      </td>
                      <td className="px-2 py-2"><StatusBadge status={b.status} /></td>
                      <td className="px-5 py-2">
                        {b.status !== "cancelada" && (
                          <div className="flex justify-end gap-2">
                            <form action={marcarPago}>
                              <input type="hidden" name="booking_id" value={b.id} />
                              <input type="hidden" name="paid" value={b.status === "pagada" ? "0" : "1"} />
                              <input type="hidden" name="back" value={backUrl} />
                              <button className="rounded-full border border-sand-200 px-3 py-1 text-xs hover:bg-sand-100">
                                {b.status === "pagada" ? "Marcar pendiente" : "Marcar pagada"}
                              </button>
                            </form>
                            <form action={cancelarComoAdmin}>
                              <input type="hidden" name="booking_id" value={b.id} />
                              <input type="hidden" name="back" value={backUrl} />
                              <button className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50">
                                Cancelar
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
