import type { Metadata } from "next";
import "./globals.css";

import Web3Provider from "@/providers/web3-provider";
import { Toaster } from "sonner";


export const metadata: Metadata = {
  title: "Arc PayLink",
  description: "Stablecoin payment links on Arc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}