import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/app-context";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elsayad Scores | السياد سكورز",
  description:
    "نتائج المباريات المباشرة، التشكيلات، الإحصائيات، الأخبار والترتيب لحظة بلحظة — Elsayad Scores",
  applicationName: "Elsayad Scores",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Elsayad Scores",
  },
  icons: { icon: "/icon.svg", apple: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#060912",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" className={cairo.variable}>
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
