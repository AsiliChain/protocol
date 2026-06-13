import Link from "next/link";
import { RegisterFarmerForm } from "./_components/RegisterFarmerForm";
import { RecordDeliveryForm } from "./_components/RecordDeliveryForm";
import { CooperativeOverview } from "./_components/CooperativeOverview";
import { FarmerList } from "./_components/FarmerList";

export default function AgentWorkspacePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
          Field Operations
        </h1>
        <p className="text-sm mt-1" style={{ color: "oklch(55% 0.012 60)" }}>
          Your workspace — manage farmers, record deliveries, and track your cooperative
        </p>
      </div>

      {/* Cooperative overview */}
      <CooperativeOverview />

      {/* Farmer list */}
      <FarmerList />

      {/* Registration and delivery forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-card p-5">
          <RegisterFarmerForm />
        </div>
        <div className="dash-card p-5">
          <RecordDeliveryForm />
        </div>
      </div>

      <div
        className="flex items-center gap-3 rounded-xl px-5 py-3"
        style={{
          backgroundColor: "oklch(100% 0 0)",
          border: "1px solid oklch(88% 0.006 60)",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 shrink-0" style={{ color: "oklch(72% 0.16 80)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <p className="text-sm" style={{ color: "oklch(55% 0.012 60)" }}>
          Recorded deliveries appear on the{" "}
          <Link href="/batches" className="font-medium transition-colors hover:underline" style={{ color: "oklch(72% 0.16 80)" }}>
            Batches
          </Link>{" "}
          page, grouped by supply chain stage.
        </p>
      </div>
    </div>
  );
}
