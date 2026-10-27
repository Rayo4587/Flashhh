import { TIMEZONE } from "./config";

const dayFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const copFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatDay = (iso: string) => capitalize(dayFmt.format(new Date(iso)));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => `${formatDay(iso)} · ${formatTime(iso)}`;
export const formatCOP = (value: number | null) => (value == null ? null : copFmt.format(value));

export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  pagada: "Pagada",
  cancelada: "Cancelada",
};
