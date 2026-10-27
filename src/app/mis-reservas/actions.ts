"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { friendlyError } from "@/lib/errors";
import { getSession } from "@/lib/supabase/server";

export async function cancelarReserva(formData: FormData) {
  const id = String(formData.get("booking_id") || "");
  const back = String(formData.get("back") || "/mis-reservas");
  const { supabase, user } = await getSession();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: id });
  if (error) redirect(`${back}?error=${encodeURIComponent(friendlyError(error.message))}`);

  revalidatePath("/", "layout");
  redirect(`${back}?ok=cancelada`);
}
