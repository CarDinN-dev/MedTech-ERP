import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedTech ERP",
  description: "Enterprise operations platform for MedTech Corporation Trading"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
