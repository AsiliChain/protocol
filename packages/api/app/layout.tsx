import type { Metadata } from "next";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-archivo",
});

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
      <body className={`${inter.className} ${archivo.variable}`}>{children}</body>
    </html>
  );
}
