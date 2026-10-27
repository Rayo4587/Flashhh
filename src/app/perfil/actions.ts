"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";

export async function guardarPerfil(formData: FormData) {
  const fullName = String(formData.get("full_name") || "").trim().slice(0, 120);
  const phone = String(formData.get("phone") || "").replace(/[^\d+\s-]/g, "").trim().slice(0, 30);
  const nextParam = String(formData.get("next") || "");
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";

  const { supabase, user } = await getSession();
  if (!user) redirect("/login?next=/perfil");

  if (!fullName || phone.replace(/\D/g, "").length < 7) {
    redirect(`/perfil?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
  redirect(next || "/perfil?ok=1");
}
