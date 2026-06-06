import { RegisterFarmerForm } from "./_components/RegisterFarmerForm";
import { RecordDeliveryForm } from "./_components/RecordDeliveryForm";

export default function AgentWorkspacePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
          Agent Workspace
        </h1>
        <p className="text-sm text-[oklch(70%_0.01_60)] mt-1">
          Register farmers and record coffee deliveries
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-card p-5">
          <RegisterFarmerForm />
        </div>
        <div className="dash-card p-5">
          <RecordDeliveryForm />
        </div>
      </div>
    </div>
  );
}
