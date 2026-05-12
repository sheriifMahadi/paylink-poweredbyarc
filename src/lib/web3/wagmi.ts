import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import {
  createPublicClient,
  http,
} from "viem";

import { arc } from "@/lib/chains/arc";

export const wagmiConfig =
  getDefaultConfig({
    appName: "Arc PayLink",

    projectId:
      process.env
        .NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    chains: [arc],

    transports: {
      [arc.id]: http(
        process.env
          .NEXT_PUBLIC_ARC_RPC_URL
      ),
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