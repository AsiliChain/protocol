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
        <h1 className="text-2xl font-bold" style={{ color: "oklch(18% 0.01 60)" }}>
          Farmers
        </h1>
        <p className="mt-1 text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
          Registered farmer profiles
        </p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
      >
        <h2 className="mb-3 font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
          Search by Wallet Address
        </h2>
        <form action={lookupFarmer} className="flex gap-3">
          <input
            name="address"
            type="text"
            placeholder="0x..."
            className="flex-1 rounded-xl px-4 py-2.5 text-sm dash-input"
          />
          <button type="submit" className="dash-btn-primary shrink-0">
            View
          </button>
        </form>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "oklch(100% 0 0)", border: "1px solid oklch(88% 0.006 60)" }}
      >
        <h2 className="mb-4 font-semibold" style={{ color: "oklch(18% 0.01 60)" }}>
          Registered Farmers
        </h2>
        <div className="space-y-2">
          {KNOWN_FARMERS.map((f, i) => (
            <a
              key={f.name}
              href={`/farmers/${f.address}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm dash-card-border"
              style={{ backgroundColor: "oklch(100% 0 0)", color: "oklch(18% 0.01 60)" }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: "oklch(23% 0.010 50)", color: "oklch(72% 0.16 80)" }}
              >
                {f.name.split(" ").map((n) => n[0]).join("")}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-medium" style={{ color: "oklch(18% 0.01 60)" }}>
                  {f.name}
                </span>
                <span className="ml-2 text-xs" style={{ color: "oklch(72% 0.16 80)" }}>
                  {f.region}
                </span>
              </div>
              <span className="font-mono text-xs" style={{ color: "oklch(55% 0.012 60)" }}>
                {f.address.slice(0, 6)}...{f.address.slice(-4)}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
