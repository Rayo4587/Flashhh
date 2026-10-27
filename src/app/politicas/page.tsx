import Policies from "@/components/Policies";

export const metadata = { title: "Políticas" };

export default function PoliticasPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-serif text-3xl">Políticas de ATC</h1>
      <div className="card">
        <Policies />
      </div>
    </div>
  );
}
