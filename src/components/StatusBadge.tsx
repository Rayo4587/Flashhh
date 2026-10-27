import { STATUS_LABEL } from "@/lib/format";

const STYLES: Record<string, string> = {
  pendiente_pago: "bg-amber-100 text-amber-800",
  pagada: "bg-emerald-100 text-emerald-800",
  cancelada: "bg-sand-100 text-sand-700 line-through",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
