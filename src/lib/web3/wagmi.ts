import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { arc } from "@/lib/chains/arc";

export const wagmiConfig = createConfig({
  chains: [arc],

  connectors: [
    injected(),
  ],

  transports: {
    [arc.id]: http(),
  },
});