"use client";

import dynamic from "next/dynamic";

const WalletClient = dynamic(
  () => import("./wallet-client"),
  {
    ssr: false,
  }
);

export default function WalletButton() {
  return <WalletClient />;
}