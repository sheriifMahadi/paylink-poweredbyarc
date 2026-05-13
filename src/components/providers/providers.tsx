"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";

import { WagmiProvider } from "wagmi";

import {
  QueryClientProvider,
} from "@tanstack/react-query";

import { wagmiConfig } from "@/lib/web3/wagmi";

import { queryClient } from "@/lib/react-query";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider
        client={queryClient}
      >
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}