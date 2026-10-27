"use server";

import { redirect } from "next/navigation";
import { sendBookingConfirmation } from "@/lib/email";
import { friendlyError } from "@/lib/errors";
import { getSession } from "@/lib/supabase/server";
import type { Booking } from "@/lib/types";

export async function reservar(formData: FormData) {
  const scheduleId = String(formData.get("schedule_id") || "");
  const classDate = String(formData.get("class_date") || "");
  
  const { supabase, user } = await getSession();
  if (!user) redirect("/login?next=/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  if (!profile?.phone || !profile?.full_name) {
    redirect("/perfil?completar=1&next=/");
  }

  const { data, error } = await supabase.rpc("book_class", {
    p_schedule_id: scheduleId,
    p_class_date: classDate,
  });

  if (error || !data) {
    redirect(`/?error=${encodeURIComponent(friendlyError(error?.message))}`);
  }

  const booking = data as Booking;

  const { data: type } = await supabase
    .from("class_schedules")
    .select("class_types(duration_minutes)")
    .eq("id", scheduleId)
    .single();
  const duration =
    (type?.class_types as unknown as { duration_minutes: number } | null)?.duration_minutes ?? 60;

  await sendBookingConfirmation({
    to: user.email!,
    name: profile.full_name,
    phone: profile.phone,
    booking,
    durationMinutes: duration,
  });

  redirect(`/reserva/${booking.id}?nueva=1`);
}
