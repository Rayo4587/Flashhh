import { POLICIES } from "@/lib/config";

export default function Policies() {
  return (
    <ul className="space-y-3 text-sm leading-relaxed">
      {POLICIES.map((p) => (
        <li key={p.title}>
          <span className="font-semibold">{p.title}:</span> {p.text}
        </li>
      ))}
    </ul>
  );
}
