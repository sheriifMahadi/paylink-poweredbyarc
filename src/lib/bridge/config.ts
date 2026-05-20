import { getAddress } from "viem";

export const USDC_ADDRESSES = {
  Base_Sepolia: getAddress(
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  ),

  Arbitrum_Sepolia: getAddress(
    "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  ),

  Ethereum_Sepolia: getAddress(
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  ),
};

export const TOKEN_MESSENGER = {
  Base_Sepolia: getAddress(
    "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA"
  ),

  Arbitrum_Sepolia: getAddress(
    "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA"
  ),

  Ethereum_Sepolia: getAddress(
    "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA"
  ),
};

export const ARC_DOMAIN = 26;
