import type { Metadata } from "next";

import "./globals.css";

import Providers from "@/components/providers/providers";

import WalletClient from "@/components/wallet/wallet-client";

export const metadata: Metadata = {
  title: "ArcPay",
  description:
    "Simple USDC payment requests on Arc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#050816] text-white antialiased">
        {/* BACKGROUND GLOW */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          {/* TOP LEFT */}
          <div className="absolute top-[-200px] left-[-100px] h-[500px] w-[500px] rounded-full bg-fuchsia-600/20 blur-3xl" />

          {/* BOTTOM RIGHT */}
          <div className="absolute bottom-[-250px] right-[-100px] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-3xl" />

          {/* CENTER GLOW */}
          <div className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-purple-700/10 blur-3xl" />
        </div>

        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* NAVBAR */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                {/* LOGO */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-blue-600 shadow-lg" />

                  <div>
                    <p className="font-semibold text-lg tracking-tight">
                      ArcPay
                    </p>

                    <p className="text-xs text-white/50">
                      USDC Payments
                    </p>
                  </div>
                </div>

                {/* WALLET */}
                <WalletClient />
              </div>
            </header>

            {/* MAIN */}
            <main className="flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}