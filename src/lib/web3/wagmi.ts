import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import {
  createPublicClient,
  http,
} from "viem";

import { arc } from "@/lib/chains/arc";
import { sepolia, baseSepolia, arbitrumSepolia } from "wagmi/chains";

export const sepoliaChains = [
  sepolia, 
  baseSepolia, 
  arbitrumSepolia,
];

export const wagmiConfig =
  getDefaultConfig({
    appName: "Arc PayLink",

    projectId:
      process.env
        .NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    chains: [arc, ...sepoliaChains],

    transports: {
      [arc.id]: http(
        process.env
          .NEXT_PUBLIC_ARC_RPC_URL
      ),
      [sepolia.id]: http(),
      [baseSepolia.id]: http(),
      [arbitrumSepolia.id]: http(),
    },

    ssr: false,
  });

export const publicClient =
  createPublicClient({
    chain: arc,

    transport: http(
      process.env
        .NEXT_PUBLIC_ARC_RPC_URL
    ),
  });