import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { BottomActions } from "@/components/bottom-actions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DebtOS — Predict your financial future",
  description: "A predictive financial survival platform for EMI tracking, cashflow forecasting, and debt elimination.",
  applicationName: "DebtOS",
};

export const viewport: Viewport = {
  themeColor: "#050507",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen text-white">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 lg:pl-64">
            <Topbar />
            <main className="px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-8 md:pt-6 lg:pb-12">
              {children}
            </main>
          </div>
          <BottomActions />
        </div>
      </body>
    </html>
  );
}
