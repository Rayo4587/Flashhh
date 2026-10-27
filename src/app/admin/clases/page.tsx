import Link from "next/link";
import { actualizarTipoClase, alternarHorario, crearHorario, crearTipoClase } from "../actions";
import { requireAdmin } from "@/lib/admin";
import { WEEKDAYS } from "@/lib/format";
import type { ClassSchedule, ClassType } from "@/lib/types";

export const metadata = { title: "Clases y horarios" };

function ClassTypeFields({ t }: { t?: ClassType }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Nombre</label>
        <input name="name" required defaultValue={t?.name} className="input" />
      </div>
      <div>
        <label className="label">Descripción</label>
        <input name="description" defaultValue={t?.description ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Sede / lugar</label>
        <input name="location" defaultValue={t?.location ?? ""} placeholder="Provenza" className="input" />
      </div>
      <div>
        <label className="label">Ciudad</label>
        <input name="city" defaultValue={t?.city ?? ""} placeholder="Medellín" className="input" />
      </div>
      <div>
        <label className="label">Precio (COP)</label>
        <input name="price_cop" inputMode="numeric" defaultValue={t?.price_cop ?? ""} placeholder="20000" className="input" />
      </div>
      <div>
        <label className="label">Link de pago Mercado Pago</label>
        <input name="payment_url" type="url" defaultValue={t?.payment_url ?? ""} placeholder="https://mpago.li/..." className="input" />
      </div>
      <div>
        <label className="label">Cupo (máx. 12)</label>
        <input name="capacity" type="number" min={1} max={12} defaultValue={t?.capacity ?? 12} className="input" />
      </div>
      <div>
        <label className="label">Duración (min)</label>
        <input name="duration_minutes" type="number" min={15} max={300} defaultValue={t?.duration_minutes ?? 60} className="input" />
      </div>
      <div>
        <label className="label">Orden</label>
        <input name="sort_order" type="number" defaultValue={t?.sort_order ?? 0} className="input" />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={t?.active ?? true} /> Activa (visible en la agenda)
      </label>
    </div>
  );
}

export default async function ClasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: types }, { data: schedules }] = await Promise.all([
    supabase.from("class_types").select("*").order("sort_order").order("name"),
    supabase.from("class_schedules").select("*").order("weekday").order("start_time"),
  ]);

  const classTypes = (types ?? []) as ClassType[];
  const allSchedules = (schedules ?? []) as ClassSchedule[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Clases y horarios</h1>
          <p className="max-w-2xl text-sm text-sand-700">
            El horario semanal se repite automáticamente cada semana: la agenda siempre muestra los próximos 14 días.
            Para quitar una clase sin perder el historial, desactívala.
          </p>
        </div>
        <Link href="/admin" className="btn-ghost">← Reservas</Link>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {ok && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Cambios guardados.</p>}

      {classTypes.map((t) => {
        const own = allSchedules.filter((s) => s.class_type_id === t.id);
        return (
          <section key={t.id} className={`card space-y-5 ${t.active ? "" : "opacity-70"}`}>
            <details>
              <summary className="cursor-pointer">
                <span className="font-serif text-xl">{t.name}</span>
                <span className="ml-2 text-sm text-sand-700">
                  {[t.location, t.city].filter(Boolean).join(" · ")} {t.active ? "" : "(inactiva)"} — editar
                </span>
              </summary>
              <form action={actualizarTipoClase} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={t.id} />
                <ClassTypeFields t={t} />
                <button className="btn-primary">Guardar clase</button>
              </form>
            </details>

            <div>
              <h3 className="label">Horario semanal</h3>
              {own.length === 0 && <p className="text-sm text-sand-700">Sin horarios todavía.</p>}
              <ul className="divide-y divide-sand-100">
                {own.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span className={s.active ? "" : "text-sand-500 line-through"}>
                      {WEEKDAYS[s.weekday - 1]} · {s.start_time.slice(0, 5)}
                      {s.instructor ? ` · ${s.instructor}` : ""}
                    </span>
                    <form action={alternarHorario}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={s.active ? "0" : "1"} />
                      <button className="rounded-full border border-sand-200 px-3 py-1 text-xs hover:bg-sand-100">
                        {s.active ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>

            <form action={crearHorario} className="space-y-3 rounded-xl bg-sand-50 p-4">
              <input type="hidden" name="class_type_id" value={t.id} />
              <p className="label">Agregar horario</p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1 rounded-full border border-sand-200 bg-white px-3 py-1 text-sm">
                    <input type="checkbox" name="weekday" value={i + 1} /> {d}
                  </label>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="start_time" type="time" required className="input" />
                <input name="instructor" placeholder="Instructor (opcional)" className="input" />
                <button className="btn-primary">Agregar</button>
              </div>
            </form>
          </section>
        );
      })}

      <section className="card">
        <details>
          <summary className="cursor-pointer font-serif text-xl">+ Nueva clase</summary>
          <form action={crearTipoClase} className="mt-4 space-y-3">
            <ClassTypeFields />
            <button className="btn-primary">Crear clase</button>
          </form>
        </details>
      </section>
    </div>
  );
}
