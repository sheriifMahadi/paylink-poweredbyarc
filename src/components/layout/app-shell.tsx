"use client";

import Link from "next/link";

import WalletButton from "@/components/wallet/connect-button";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#312e81_0%,#050816_45%)]" />

        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/20 blur-3xl rounded-full" />

        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-pink-600/20 blur-3xl rounded-full" />
      </div>

      {/* NAVBAR */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* LOGO */}
          <Link
            href="/create"
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
              A
            </div>

            <span className="font-semibold text-lg tracking-tight">
              ArcPay
            </span>
          </Link>

          {/* NAV */}
          <div className="flex items-center gap-3">
            <WalletButton />
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {children}
      </main>
    </div>
  );
}