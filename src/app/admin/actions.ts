"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { friendlyError } from "@/lib/errors";

function back(formData: FormData) {
  const b = String(formData.get("back") || "/admin");
  return b.startsWith("/admin") ? b : "/admin";
}

function withParam(url: string, key: string, value: string) {
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

export async function marcarPago(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_payment", {
    p_booking_id: String(formData.get("booking_id")),
    p_paid: formData.get("paid") === "1",
  });
  revalidatePath("/admin");
  if (error) redirect(withParam(back(formData), "error", friendlyError(error.message)));
  redirect(back(formData));
}

export async function cancelarComoAdmin(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: String(formData.get("booking_id")),
  });
  revalidatePath("/", "layout");
  if (error) redirect(withParam(back(formData), "error", friendlyError(error.message)));
  redirect(back(formData));
}

// ---------- Clases y horarios ----------

const text = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};
const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  return s.length ? Number(s) : null;
};

function classTypeFields(formData: FormData) {
  const paymentUrl = text(formData.get("payment_url"));
  return {
    name: text(formData.get("name")) ?? "Clase",
    description: text(formData.get("description")),
    location: text(formData.get("location")),
    city: text(formData.get("city")),
    price_cop: int(formData.get("price_cop")),
    payment_url: paymentUrl && /^https:\/\//.test(paymentUrl) ? paymentUrl : null,
    capacity: Math.min(Math.max(int(formData.get("capacity")) ?? 12, 1), 12),
    duration_minutes: Math.min(Math.max(int(formData.get("duration_minutes")) ?? 60, 15), 300),
    sort_order: int(formData.get("sort_order")) ?? 0,
    active: formData.get("active") === "on",
  };
}

function done(error: { message: string } | null) {
  revalidatePath("/", "layout");
  if (error) redirect(`/admin/clases?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/clases?ok=1");
}

export async function crearTipoClase(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("class_types").insert(classTypeFields(formData));
  done(error);
}

export async function actualizarTipoClase(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("class_types")
    .update(classTypeFields(formData))
    .eq("id", String(formData.get("id")));
  done(error);
}

export async function crearHorario(formData: FormData) {
  const { supabase } = await requireAdmin();
  const weekdays = formData.getAll("weekday").map(Number).filter((n) => n >= 1 && n <= 7);
  const startTime = String(formData.get("start_time") || "");
  if (!weekdays.length || !/^\d{2}:\d{2}$/.test(startTime)) {
    redirect("/admin/clases?error=" + encodeURIComponent("Elige al menos un día y una hora."));
  }
  const rows = weekdays.map((weekday) => ({
    class_type_id: String(formData.get("class_type_id")),
    weekday,
    start_time: startTime,
    instructor: text(formData.get("instructor")),
  }));
  const { error } = await supabase.from("class_schedules").insert(rows);
  done(error);
}

export async function alternarHorario(formData: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("class_schedules")
    .update({ active: formData.get("active") === "1" })
    .eq("id", String(formData.get("id")));
  done(error);
}
