import type { Metadata } from "next";
import Header from "@/components/Header";
import { SITE_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `Reservas · ${SITE_NAME}`, template: `%s · ${SITE_NAME}` },
  description: "Agenda y reserva tus clases de ATC · Wellness at the Club.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <Header />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">{children}</main>
        <footer className="border-t border-sand-200 py-8 text-center text-xs text-sand-700">
          {SITE_NAME} · <a href="https://wellnessattheclub.com" className="underline">wellnessattheclub.com</a> ·{" "}
          <a href="/politicas" className="underline">Políticas</a>
        </footer>
      </body>
    </html>
  );
}
