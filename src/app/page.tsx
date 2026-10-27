import Link from "next/link";
import { reservar } from "./reservar/actions";
import { AGENDA_DAYS } from "@/lib/config";
import { formatCOP, formatDay, formatTime } from "@/lib/format";
import { getSession } from "@/lib/supabase/server";
import type { AgendaItem } from "@/lib/types";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ clase?: string; ciudad?: string; error?: string }>;
}) {
  const { clase, ciudad, error } = await searchParams;
  const { supabase, user } = await getSession();

  const [{ data: agenda, error: agendaError }, { data: mine }] = await Promise.all([
    supabase.rpc("get_agenda", { p_days: AGENDA_DAYS }),
    user
      ? supabase
          .from("bookings")
          .select("id, schedule_id, class_date")
          .neq("status", "cancelada")
          .gte("starts_at", new Date().toISOString())
      : Promise.resolve({ data: [] as { id: string; schedule_id: string; class_date: string }[] }),
  ]);

  const items = (agenda ?? []) as AgendaItem[];
  const myBookings = new Map(
    (mine ?? []).map((b) => [`${b.schedule_id}:${b.class_date}`, b.id] as const),
  );

  const classNames = [...new Set(items.map((i) => i.class_name))];
  const cities = [...new Set(items.map((i) => i.city).filter(Boolean))] as string[];

  const filtered = items.filter(
    (i) => (!clase || i.class_name === clase) && (!ciudad || i.city === ciudad),
  );

  const byDay = new Map<string, AgendaItem[]>();
  for (const item of filtered) {
    const list = byDay.get(item.class_date) ?? [];
    list.push(item);
    byDay.set(item.class_date, list);
  }

  const filterHref = (params: { clase?: string; ciudad?: string }) => {
    const q = new URLSearchParams();
    if (params.clase) q.set("clase", params.clase);
    if (params.ciudad) q.set("ciudad", params.ciudad);
    const s = q.toString();
    return s ? `/?${s}` : "/";
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${active ? "border-olive-700 bg-olive-700 text-white" : "border-sand-200 bg-white hover:bg-sand-100"}`;

  return (
    <div>
      <section className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl">Agenda de clases</h1>
        <p className="mt-2 max-w-2xl text-sand-700">
          Reserva tu cupo para las próximas dos semanas. Cada clase tiene un máximo de 12 personas.
          La agenda se renueva automáticamente cada semana.
        </p>
      </section>

      {error && <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {agendaError && (
        <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          No pudimos cargar la agenda. Intenta de nuevo en un momento.
        </p>
      )}

      {(classNames.length > 1 || cities.length > 1) && (
        <div className="mb-8 space-y-3">
          {cities.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Link href={filterHref({ clase })} className={chip(!ciudad)}>Todas las sedes</Link>
              {cities.map((c) => (
                <Link key={c} href={filterHref({ clase, ciudad: c })} className={chip(ciudad === c)}>{c}</Link>
              ))}
            </div>
          )}
          {classNames.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Link href={filterHref({ ciudad })} className={chip(!clase)}>Todas las clases</Link>
              {classNames.map((c) => (
                <Link key={c} href={filterHref({ ciudad, clase: c })} className={chip(clase === c)}>{c}</Link>
              ))}
            </div>
          )}
        </div>
      )}

      {byDay.size === 0 && !agendaError && (
        <div className="card text-center text-sand-700">
          No hay clases programadas en los próximos días. ¡Vuelve pronto!
        </div>
      )}

      <div className="space-y-8">
        {[...byDay.entries()].map(([day, list]) => (
          <section key={day} id={`dia-${day}`}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sand-700">
              {formatDay(list[0].starts_at)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((item) => {
                const left = Math.max(item.capacity - item.booked, 0);
                const myId = myBookings.get(`${item.schedule_id}:${item.class_date}`);
                const place = [item.location, item.city].filter(Boolean).join(" · ");
                const price = formatCOP(item.price_cop);
                return (
                  <article key={`${item.schedule_id}-${item.class_date}`} className="card flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold">{formatTime(item.starts_at)}</p>
                        <h3 className="font-serif text-lg">{item.class_name}</h3>
                        {place && <p className="text-sm text-sand-700">{place}</p>}
                        {item.instructor && <p className="text-sm text-sand-700">Con {item.instructor}</p>}
                      </div>
                      <div className="text-right text-sm">
                        {price && <p className="font-semibold">{price}</p>}
                        <p className="text-sand-700">{item.duration_minutes} min</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-sm ${left === 0 ? "text-red-700" : left <= 3 ? "text-amber-700" : "text-olive-600"}`}>
                        {left === 0 ? "Clase llena" : `${left} de ${item.capacity} cupos disponibles`}
                      </span>
                      {myId ? (
                        <Link href={`/reserva/${myId}`} className="btn-ghost">Ya reservaste ✓</Link>
                      ) : (
                        <form action={reservar}>
                          <input type="hidden" name="schedule_id" value={item.schedule_id} />
                          <input type="hidden" name="class_date" value={item.class_date} />
                          <button className="btn-primary" disabled={left === 0}>
                            {left === 0 ? "Sin cupos" : user ? "Reservar" : "Ingresar y reservar"}
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
