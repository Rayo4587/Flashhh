export const SITE_NAME = "ATC · Wellness at the Club";
export const SITE_SHORT = "ATC";
export const TIMEZONE = "America/Bogota";
export const MAX_CAPACITY = 12;
export const AGENDA_DAYS = 14;
// Debe coincidir con el intervalo de public.cancel_booking en supabase/migrations/0001_init.sql
export const CANCEL_HOURS = 12;

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Políticas que se muestran en la web y se envían en el correo de confirmación.
// Edítalas a tu gusto.
export const POLICIES: { title: string; text: string }[] = [
  {
    title: "Pago",
    text: "Tu cupo queda separado al reservar y se confirma con el pago por Mercado Pago. Las reservas sin pago podrán ser liberadas por el equipo de ATC.",
  },
  {
    title: "Cancelaciones",
    text: `Puedes cancelar desde "Mis reservas" hasta ${CANCEL_HOURS} horas antes de la clase. Después de ese plazo o si no asistes, la clase se considera tomada y no hay reembolso.`,
  },
  {
    title: "Puntualidad",
    text: "Llega 10 minutos antes. Pasados 10 minutos del inicio no podremos garantizar tu ingreso para no interrumpir la sesión.",
  },
  {
    title: "Cupos",
    text: `Cada clase tiene un máximo de ${MAX_CAPACITY} personas para garantizar una atención personalizada.`,
  },
  {
    title: "Salud",
    text: "Informa al instructor sobre lesiones, embarazo o condiciones médicas antes de iniciar. Trae agua y toalla.",
  },
];
