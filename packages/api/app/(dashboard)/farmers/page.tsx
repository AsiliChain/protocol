import { redirect } from "next/navigation";

const KNOWN_FARMERS = [
  { address: "0xB70f03dE20c9D4c90246c830F81D44f377A652C0", name: "Amina Nakato", region: "Mbale" },
  { address: "0xB70f03dE20c9D4c90246c830F81D44f377A652C0", name: "Joseph Wekesa", region: "Mbale" },
  { address: "0xB70f03dE20c9D4c90246c830F81D44f377A652C0", name: "Grace Chemutai", region: "Kapchorwa" },
];

async function lookupFarmer(formData: FormData) {
  "use server";
  const address = formData.get("address");
  if (typeof address === "string" && address.startsWith("0x") && address.length >= 42) {
    redirect(`/farmers/${address}`);
  }
}

export default function FarmersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Farmers</h1>
        <p className="mt-1 text-sm text-navy-400">
          Registered farmer profiles
        </p>
      </div>

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-navy-900">Registered Farmers</h2>
        <div className="space-y-2">
          {KNOWN_FARMERS.map((f) => (
            <a
              key={f.name}
              href={`/farmers/${f.address}`}
              className="flex items-center justify-between rounded-lg border border-navy-100 bg-navy-50 px-4 py-3 text-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <div>
                <span className="font-medium text-navy-900">{f.name}</span>
                <span className="ml-3 text-xs text-navy-400">{f.region}</span>
              </div>
              <span className="font-mono text-xs text-navy-500">
                {f.address.slice(0, 6)}...{f.address.slice(-4)}
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="mb-3 font-semibold text-navy-900">Search by Wallet Address</h2>
        <form action={lookupFarmer} className="flex gap-3">
          <input
            name="address"
            type="text"
            placeholder="0x..."
            className="flex-1 rounded-md border border-navy-200 px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            View
          </button>
        </form>
      </div>
    </div>
  );
}
