export const bridgeChains = {
  ethereum: {
    chainId: 11155111,
    name: "Ethereum Sepolia",
  },

  arbitrum: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
  },

  base: {
    chainId: 84532,
    name: "Base Sepolia",
  },

  arc: {
    chainId: Number(
      process.env
        .NEXT_PUBLIC_ARC_CHAIN_ID
    ),

    name: "Arc",
  },
};