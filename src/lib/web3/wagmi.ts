import { getDefaultConfig } from "@rainbow-me/rainbowkit";

import { arc } from "@/lib/chains/arc";

export const wagmiConfig = getDefaultConfig({
  appName: "Arc PayLink",

  projectId:
    process.env
      .NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

  chains: [arc],

  ssr: false,
});