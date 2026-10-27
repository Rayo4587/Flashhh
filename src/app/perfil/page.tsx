import { redirect } from "next/navigation";
import { guardarPerfil } from "./actions";
import { getSession } from "@/lib/supabase/server";

export const metadata = { title: "Perfil" };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ completar?: string; next?: string; error?: string; ok?: string }>;
}) {
  const { completar, next, error, ok } = await searchParams;
  const { supabase, user } = await getSession();
  if (!user) redirect("/login?next=/perfil");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 font-serif text-3xl">Tu perfil</h1>
      {completar && (
        <p className="mb-4 rounded-xl bg-sand-100 p-4 text-sm">
          Antes de tu primera reserva, completa tu nombre y celular (WhatsApp) para poder contactarte.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">Escribe tu nombre y un celular válido.</p>
      )}
      {ok && <p className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Perfil guardado.</p>}

      <form action={guardarPerfil} className="card space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label className="label">Correo</label>
          <p className="text-sm">{profile?.email ?? user.email}</p>
        </div>
        <div>
          <label className="label" htmlFor="full_name">Nombre completo</label>
          <input id="full_name" name="full_name" required className="input" defaultValue={profile?.full_name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Celular / WhatsApp</label>
          <input id="phone" name="phone" type="tel" required placeholder="+57 300 000 0000" className="input" defaultValue={profile?.phone ?? ""} />
        </div>
        <button className="btn-primary w-full">{completar ? "Guardar y continuar" : "Guardar"}</button>
      </form>
    </div>
  );
}
