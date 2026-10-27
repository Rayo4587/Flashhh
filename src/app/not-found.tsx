import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="font-serif text-2xl">Página no encontrada</h1>
      <Link href="/" className="btn-primary mt-4">Ir a la agenda</Link>
    </div>
  );
}
