"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletClient() {
  return (
    <ConnectButton
      showBalance={false}
      accountStatus="avatar"
      chainStatus="icon"
    />
  );
}