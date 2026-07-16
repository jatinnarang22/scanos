import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScanOS · Scan Slot Scheduler",
  description: "Day-view scheduling board for diagnostic imaging machines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">{children}</body>
    </html>
  );
}
