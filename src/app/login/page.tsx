import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import GoogleButton from "./GoogleButton";

export const metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const { user } = await getSession();
  if (user) redirect(safeNext);

  return (
    <div className="mx-auto max-w-sm pt-10">
      <div className="card text-center">
        <h1 className="font-serif text-2xl">Te damos la bienvenida a ATC</h1>
        <p className="mt-2 text-sm text-sand-700">
          Crea tu cuenta o ingresa para reservar tus clases y gestionar tus reservas.
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            No pudimos iniciar sesión. Intenta de nuevo.
          </p>
        )}
        <div className="mt-6">
          <GoogleButton next={safeNext} />
        </div>
        <p className="mt-4 text-xs text-sand-700">
          Al continuar aceptas nuestras <a className="underline" href="/politicas">políticas</a>.
        </p>
      </div>
    </div>
  );
}
