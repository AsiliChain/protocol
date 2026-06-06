export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash-body min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}
