"use client";

import { useState } from "react";

import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";

import { toast } from "sonner";

import {
  useSwitchChain,
} from "wagmi";

import { BridgeKit } from "@circle-fin/bridge-kit";

import {
  createViemAdapterFromProvider,
} from "@circle-fin/adapter-viem-v2";

type Props = {
  open: boolean;
  onToggle: () => void;
  amount: number;
  wallet?: string;
  onBridgeSuccess?: () => void;
};

type BridgeStatus =
  | "idle"
  | "preparing"
  | "bridging"
  | "completed"
  | "failed";

const kit = new BridgeKit();

const chains = [
  {
    id: "Base_Sepolia",
    name: "Base Sepolia",
    speed: "Fast",
    chainId: 84532,
  },

  {
    id: "Arbitrum_Sepolia",
    name: "Arbitrum Sepolia", 
    speed: "Fast",
    chainId: 421614,
  },

  {
    id: "Ethereum_Sepolia",
    name: "Ethereum Sepolia",
    speed: "Slower", 
    chainId: 11155111,
  },
];

export default function BridgeWidget({
  open,
  onToggle,
  amount,
  wallet,
  onBridgeSuccess,
}: Props) {
  const [selectedChain, setSelectedChain] =
    useState("Base");

  const [bridging, setBridging] =
    useState(false);

  const [bridgeStatus, setBridgeStatus] =
    useState<BridgeStatus>("idle");

  const [explorerUrl, setExplorerUrl] =
    useState("");

  const { switchChainAsync } =
    useSwitchChain();

  const handleBridge = async () => {
    try {
      if (!wallet) {
        toast.error(
          "Connect wallet first"
        );

        return;
      }

      if (!window.ethereum) {
        toast.error(
          "No wallet detected"
        );

        return;
      }

      setBridging(true);

      setBridgeStatus(
        "preparing"
      );

      setExplorerUrl("");

      const sourceChain =
        chains.find(
          (c) =>
            c.id === selectedChain
        );

      if (!sourceChain) {
        throw new Error(
          "Invalid source chain"
        );
      }

      /*
        SWITCH CHAIN
      */
      toast.info(
        `Switching to ${sourceChain.name}...`
      );

      await switchChainAsync({
        chainId:
          sourceChain.chainId,
      });

      /*
        CREATE ADAPTER
      */
      const adapter =
        await createViemAdapterFromProvider(
          {
            provider:
              window.ethereum,
          }
        );

      setBridgeStatus(
        "bridging"
      );

      toast.info(
        `Bridging ${amount} USDC from ${sourceChain.name} to Arc...`
      );

      console.log(
        "🌉 Starting bridge",
        {
          from:
            sourceChain.id,
          to: "Arc",
          amount,
          wallet,
        }
      );

      /*
        EXECUTE BRIDGE
      */    
const safeAmount = Number(amount).toFixed(6);
console.log(sourceChain.id, safeAmount, wallet);
      const result =
        await kit.bridge({
          from: {
            adapter,
            chain:
              sourceChain.id,
          },

          to: {
            adapter,
            chain: "Arc_Testnet",
          },

          amount: safeAmount,

          recipient: wallet,
        });

      console.log(
        "✅ Bridge result:",
        result
      );

      /*
        EXPLORER
      */
      if (
        result &&
        typeof result ===
          "object" &&
        "explorerUrl" in result
      ) {
        setExplorerUrl(
          String(
            result.explorerUrl
          )
        );
      }

      setBridgeStatus(
        "completed"
      );

      toast.success(
        "Funds bridged successfully"
      );

      onBridgeSuccess?.();
    } catch (err) {
      console.error(
        err
      );

      setBridgeStatus(
        "failed"
      );

      toast.error(
        err instanceof Error
          ? err.message
          : "Bridge failed"
      );
    } finally {
      setBridging(false);
    }
  };

  return (
    <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-left">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-yellow-300" />

            <p className="font-semibold text-yellow-300">
              Insufficient USDC on Arc
            </p>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-white/70">
            You need{" "}
            <span className="font-semibold text-white">
              {amount} USDC
            </span>{" "}
            on Arc to complete
            payment.
          </p>

          <p className="mt-1 text-sm text-white/50">
            Bridge funds from
            another chain.
          </p>
        </div>

        <button
          onClick={onToggle}
          disabled={bridging}
          className="flex items-center gap-2 rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {open ? (
            <>
              Close

              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Bridge

              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* CONTENT */}
      {open && (
        <div className="mt-5 space-y-5 rounded-3xl border border-white/10 bg-black/20 p-5">
          {/* CHAINS */}
          <div>
            <p className="text-sm font-medium text-white">
              Select Source Chain
            </p>

            <div className="mt-4 space-y-3">
              {chains.map(
                (chain) => {
                  const active =
                    selectedChain ===
                    chain.id;

                  return (
                    <button
                      key={chain.id}
                      disabled={
                        bridging
                      }
                      onClick={() =>
                        setSelectedChain(
                          chain.id
                        )
                      }
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-fuchsia-500 bg-fuchsia-500/10"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">
                              {
                                chain.name
                              }
                            </p>

                            {active && (
                              <Check className="h-4 w-4 text-fuchsia-300" />
                            )}
                          </div>

                          <p className="text-xs text-white/50">
                            Bridge USDC
                            from{" "}
                            {
                              chain.name
                            }
                          </p>
                        </div>

                        <span className="text-xs text-yellow-300">
                          {
                            chain.speed
                          }
                        </span>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* STATUS */}
          {bridgeStatus !==
            "idle" && (
            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
              <div className="flex items-center gap-2 text-sm">
                {bridgeStatus ===
                "completed" ? (
                  <Check className="h-4 w-4 text-green-300" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-fuchsia-300" />
                )}

                <span className="text-white">
                  {bridgeStatus ===
                    "preparing" &&
                    "Preparing bridge..."}

                  {bridgeStatus ===
                    "bridging" &&
                    "Waiting for wallet confirmation..."}

                  {bridgeStatus ===
                    "completed" &&
                    "Funds arrived on Arc"}

                  {bridgeStatus ===
                    "failed" &&
                    "Bridge failed"}
                </span>
              </div>

              {explorerUrl && (
                <a
                  href={
                    explorerUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-xs text-blue-300 hover:underline"
                >
                  View Transaction

                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* INFO */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-white/80">
              Powered by Circle
              Bridge Kit
            </p>

            <p className="mt-1 text-xs text-white/50">
              Uses your connected
              wallet directly. No
              private keys required.
            </p>
          </div>

          {/* ACTION */}
          <button
            onClick={handleBridge}
            disabled={bridging}
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-5 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bridging ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />

                Bridging...
              </div>
            ) : (
              `Bridge ${amount} USDC`
            )}
          </button>
        </div>
      )}
    </div>
  );
}