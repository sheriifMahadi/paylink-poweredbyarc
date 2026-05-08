import { defineChain } from "viem";

export const arc = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID),

  name: "Arc",

  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },

  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || ""],
    },
  },

  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://testnet.arcscan.app/",
    },
  },
});