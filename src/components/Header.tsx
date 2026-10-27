import Link from "next/link";
import { getSession } from "@/lib/supabase/server";

export default async function Header() {
  const { user, isAdmin } = await getSession();

  return (
    <header className="border-b border-sand-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="leading-tight">
          <span className="block text-[11px] font-semibold tracking-[0.3em] text-sand-700">ATC</span>
          <span className="font-serif text-lg">Wellness at the Club</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <Link href="/" className="rounded-full px-3 py-2 hover:bg-sand-100">Agenda</Link>
          {user && (
            <Link href="/mis-reservas" className="rounded-full px-3 py-2 hover:bg-sand-100">Mis reservas</Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="rounded-full px-3 py-2 font-semibold text-olive-700 hover:bg-sand-100">
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link href="/perfil" className="rounded-full px-3 py-2 hover:bg-sand-100">Perfil</Link>
              <form action="/auth/signout" method="post">
                <button className="rounded-full px-3 py-2 text-sand-700 hover:bg-sand-100">Salir</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary ml-1">Ingresar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
