import { getPublicClient } from "@/lib/mantle";
export const dynamic = "force-dynamic";
import { addresses, purchaseOrderAbi, batchTokenAbi } from "@/lib/contracts";
import { formatUsdc, formatDate } from "@/lib/dashboard";
import { CommitPoForm } from "./_components/CommitPoForm";
import { OriginateLoanForm } from "./_components/OriginateLoanForm";

const PO_STATUS = ["Pending", "Confirmed", "Cancelled"];

export default async function PurchaseOrdersPage() {
  const publicClient = getPublicClient();

  // Read next order ID to know how many exist
  let nextOrderId = 0n;
  try {
    nextOrderId = await publicClient.readContract({
      address: addresses.purchaseOrder,
      abi: purchaseOrderAbi,
      functionName: "nextOrderId",
    });
  } catch {
    // contract read failed
  }

  // Fetch all orders
  const orderIds = Array.from({ length: Number(nextOrderId) }, (_, i) => i);
  const orders = await Promise.all(
    orderIds.map(async (id) => {
      try {
        const o = await publicClient.readContract({
          address: addresses.purchaseOrder,
          abi: purchaseOrderAbi,
          functionName: "orders",
          args: [BigInt(id)],
        });
        return {
          id: Number(o[0]),
          batchTokenId: Number(o[1]),
          buyerWallet: o[2] as string,
          organisation: o[3] as string,
          priceUsdc: o[4] as bigint,
          created: Number(o[5]),
          status: Number(o[7]),
        };
      } catch {
        return null;
      }
    }),
  );

  const validOrders = orders.filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: "oklch(18% 0.01 60)" }}
        >
          Purchase Orders
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(70% 0.01 60)" }}>
          Buyer commitments and loan origination against coffee batches
        </p>
      </div>

      {/* Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-card p-5">
          <CommitPoForm />
        </div>
        <div className="dash-card p-5">
          <OriginateLoanForm />
        </div>
      </div>

      {/* Orders table */}
      <div className="dash-card p-5">
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "oklch(72% 0.16 80)" }}
        >
          Existing Purchase Orders ({validOrders.length})
        </h2>

        {validOrders.length === 0 ? (
          <p className="text-sm" style={{ color: "oklch(60% 0.01 60)" }}>
            No purchase orders yet. Create one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="dash-table-header">
                  <th className="pb-2 pr-4">PO #</th>
                  <th className="pb-2 pr-4">Batch</th>
                  <th className="pb-2 pr-4">Buyer</th>
                  <th className="pb-2 pr-4">Organisation</th>
                  <th className="pb-2 pr-4">Price (USDC)</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {validOrders.map((o) => (
                  <tr key={o!.id} className="dash-table-row">
                    <td className="pr-4 text-sm font-mono">#{o!.id}</td>
                    <td className="pr-4">
                      <a
                        href={`/batches/${o!.batchTokenId}`}
                        className="text-sm font-mono hover:underline"
                        style={{ color: "oklch(72% 0.16 80)" }}
                      >
                        #{o!.batchTokenId}
                      </a>
                    </td>
                    <td className="pr-4 text-sm font-mono">
                      {o!.buyerWallet.slice(0, 6)}...{o!.buyerWallet.slice(-4)}
                    </td>
                    <td className="pr-4 text-sm">{o!.organisation}</td>
                    <td className="pr-4 text-sm font-mono">
                      {formatUsdc(o!.priceUsdc)}
                    </td>
                    <td className="pr-4 text-sm">{formatDate(o!.created)}</td>
                    <td className="text-sm">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor:
                            o!.status === 0
                              ? "oklch(40% 0.05 80 / 0.2)"
                              : o!.status === 1
                                ? "oklch(62% 0.17 155 / 0.2)"
                                : "oklch(40% 0.01 55 / 0.2)",
                          color:
                            o!.status === 0
                              ? "oklch(72% 0.16 80)"
                              : o!.status === 1
                                ? "oklch(62% 0.17 155)"
                                : "oklch(60% 0.01 60)",
                        }}
                      >
                        {PO_STATUS[o!.status] ?? "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
