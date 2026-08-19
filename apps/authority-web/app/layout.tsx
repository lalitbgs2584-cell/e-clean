import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "E-CLEAN | Authority Operations", description: "Municipal waste operations command center" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
