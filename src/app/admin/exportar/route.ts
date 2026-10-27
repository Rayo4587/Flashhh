import { NextResponse } from "next/server";
import { loadBookings, parseRange } from "@/lib/admin";
import { STATUS_LABEL, formatDay, formatTime } from "@/lib/format";
import { getSession } from "@/lib/supabase/server";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // evita fórmulas en Excel
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  const { supabase, user, isAdmin } = await getSession();
  if (!user || !isAdmin) return new NextResponse("No autorizado", { status: 403 });

  const url = new URL(request.url);
  const { from, to } = parseRange(url.searchParams.get("desde") ?? undefined, url.searchParams.get("hasta") ?? undefined);
  const bookings = await loadBookings(supabase, from, to, url.searchParams.get("canceladas") === "1");

  const header = ["Fecha", "Hora", "Clase", "Lugar", "Nombre", "Correo", "Celular", "Estado", "Reservado el"];
  const lines = bookings.map((b) =>
    [
      formatDay(b.starts_at),
      formatTime(b.starts_at),
      b.class_name,
      b.location,
      b.profile?.full_name,
      b.profile?.email,
      b.profile?.phone,
      STATUS_LABEL[b.status],
      new Date(b.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    ]
      .map(cell)
      .join(","),
  );

  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas-atc-${from}-a-${to}.csv"`,
    },
  });
}
