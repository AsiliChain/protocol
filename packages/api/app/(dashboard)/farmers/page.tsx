import Link from "next/link";
import { redirect } from "next/navigation";

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

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm text-brand-800">
          Farmer listing requires a wallet address search. Use the API or block
          explorer to find registered farmer addresses.
        </p>
      </div>

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="mb-3 font-semibold text-navy-900">
          Search by Wallet Address
        </h2>
        <p className="mb-4 text-sm text-navy-400">
          The farmer registry uses wallet addresses as primary keys. Enter an
          address below to view a farmer&apos;s profile.
        </p>
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

      <div className="rounded-lg border border-navy-200 bg-white p-6">
        <h2 className="mb-3 font-semibold text-navy-900">API Reference</h2>
        <p className="mb-2 text-sm text-navy-400">
          Farmer data is also available via the API:
        </p>
        <div className="space-y-1.5 text-sm">
          <code className="block rounded bg-navy-50 px-3 py-2 font-mono text-xs text-navy-600">
            GET /api/farmers/0x... — Get farmer by wallet address
          </code>
          <code className="block rounded bg-navy-50 px-3 py-2 font-mono text-xs text-navy-600">
            GET /api/farmers/0x.../credit-score — Get farmer credit score
          </code>
        </div>
      </div>
    </div>
  );
}
