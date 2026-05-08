"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
} from "wagmi";

import { useMounted } from "@/hooks/use-mounted";

export default function ConnectButton() {
  const mounted = useMounted();

  const { address, isConnected } = useAccount();

  const { connect, connectors } = useConnect();

  const { disconnect } = useDisconnect();

  if (!mounted) {
    return null;
  }

  const connector = connectors[0];

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-lg border px-4 py-2"
      >
        Disconnect {address?.slice(0, 6)}...
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector })}
      className="rounded-lg border px-4 py-2"
    >
      Connect Wallet
    </button>
  );
}