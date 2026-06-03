import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asilichain — Coffee Supply Chain Finance on Mantle",
  description:
    "On-chain financial infrastructure for Uganda's coffee farmers. GPS-verified crops, instant payments, automated EUDR compliance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
