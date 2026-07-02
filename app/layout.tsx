import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedTech ERP",
  description: "Enterprise operations platform for MedTech Corporation Trading",
  icons: {
    icon: "/brand-mark.svg",
    shortcut: "/favicon.ico"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
