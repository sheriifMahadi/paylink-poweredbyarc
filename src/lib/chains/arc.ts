import { defineChain } from "viem";

export const arc = defineChain({
  id: Number(
    process.env
      .NEXT_PUBLIC_ARC_CHAIN_ID
  ),

  name: "Arc Testnet",

  network: "arc-testnet",

  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },

  rpcUrls: {
    default: {
      http: [
        process.env
          .NEXT_PUBLIC_ARC_RPC_URL || "",
      ],
    },

    public: {
      http: [
        process.env
          .NEXT_PUBLIC_ARC_RPC_URL || "",
      ],
    },
  },

  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },

  testnet: true,
});