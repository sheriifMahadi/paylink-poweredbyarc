"use client";

import { useMemo, useState } from "react";

import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";

import { toast } from "sonner";

import { useSwitchChain } from "wagmi";

import { BridgeKit } from "@circle-fin/bridge-kit";

import {
  createViemAdapterFromProvider,
} from "@circle-fin/adapter-viem-v2";

type BridgeChainIdentifier =
  | "Base_Sepolia"
  | "Arbitrum_Sepolia"
  | "Ethereum_Sepolia"
  | "Arc_Testnet";

type Props = {
  open: boolean;
  onToggle: () => void;

  /*
    THIS MUST ALWAYS BE:
    paymentAmount - currentBalance

    NEVER pass total payment amount.
  */
  amount: number;

  wallet?: string;

  onBridgeSuccess?: () => void;
};

type BridgeStatus =
  | "idle"
  | "switching"
  | "awaiting_signature"
  | "bridging"
  | "completed"
  | "failed";

const kit = new BridgeKit();

const BUFFER = 0.1;

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
  /*
    CRITICAL FIX:

    We memoize the bridge amount from the REAL
    missing amount coming from parent.

    This prevents stale rerender math bugs.
  */
  const bridgeAmount = useMemo(() => {
    const safeMissingAmount = Math.max(
      Number(amount || 0),
      0
    );

    /*
      If already funded,
      don't add buffer.
    */
    if (safeMissingAmount <= 0) {
      return 0;
    }

    return Number(
      (
        safeMissingAmount + BUFFER
      ).toFixed(6)
    );
  }, [amount]);

  const [selectedChain, setSelectedChain] =
    useState("Base_Sepolia");

  const [bridging, setBridging] =
    useState(false);

  const [bridgeStatus, setBridgeStatus] =
    useState<BridgeStatus>("idle");

  const [explorerUrl, setExplorerUrl] =
    useState("");

  const { switchChainAsync } =
    useSwitchChain();

  const handleBridge = async () => {
    let bridgeToast;

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

      /*
        EXTRA SAFETY

        Prevent accidental full payment bridge.
      */
      if (
        bridgeAmount <= 0 ||
        !Number.isFinite(
          bridgeAmount
        )
      ) {
        toast.error(
          "No bridge required"
        );

        return;
      }

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

      setBridging(true);

      setExplorerUrl("");

      /*
        PREPARING
      */
      bridgeToast = toast.loading(
        "Preparing bridge transaction...",
        {
          duration: Infinity,
        }
      );

      /*
        SWITCH NETWORK
      */
      setBridgeStatus(
        "switching"
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

      /*
        WAITING FOR SIGNATURE
      */
      setBridgeStatus(
        "awaiting_signature"
      );

      toast.dismiss(
        bridgeToast
      );

      bridgeToast =
        toast.loading(
          "Waiting for wallet confirmation...",
          {
            duration:
              Infinity,
          }
        );

      /*
        FINAL SAFE AMOUNT
      */
      const safeAmount =
        bridgeAmount.toFixed(6);

      console.log(
        "🌉 Bridging exact missing amount:",
        {
          missingAmount:
            amount,
          finalBridgeAmount:
            safeAmount,
        }
      );

      /*
        EXECUTE BRIDGE
      */
      const result =
        await kit.bridge({
          from: {
            adapter,
            chain:
              sourceChain.id as BridgeChainIdentifier,
          },

          to: {
            adapter,
            chain:
              "Arc_Testnet" as BridgeChainIdentifier,
          },

          amount:
            safeAmount,
        });

      /*
        BRIDGING
      */
      setBridgeStatus(
        "bridging"
      );

      toast.dismiss(
        bridgeToast
      );

      bridgeToast =
        toast.loading(
          "Bridge transaction submitted...",
          {
            duration:
              Infinity,
          }
        );

      console.log(
        "🌉 Bridge Result:",
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

      /*
        SUCCESS
      */
      setBridgeStatus(
        "completed"
      );

      toast.dismiss(
        bridgeToast
      );

      toast.success(
        "Bridge submitted successfully"
      );

      /*
        IMPORTANT

        Parent MUST refetch balance here.
      */
      onBridgeSuccess?.();
    } catch (err) {
      console.error(err);

      if (bridgeToast) {
        toast.dismiss(
          bridgeToast
        );
      }

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

  const renderStatus = () => {
    switch (
      bridgeStatus
    ) {
      case "switching":
        return "Switching network...";

      case "awaiting_signature":
        return "Waiting for wallet confirmation...";

      case "bridging":
        return "Bridging funds to Arc...";

      case "completed":
        return "Funds arriving on Arc";

      case "failed":
        return "Bridge failed";

      default:
        return "";
    }
  };

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-left shadow-xl backdrop-blur-xl">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-yellow-300" />

          <p className="text-sm font-semibold text-yellow-300">
            Insufficient USDC
          </p>
        </div>

        <button
          onClick={onToggle}
          disabled={bridging}
          className="flex items-center gap-1 rounded-xl bg-yellow-400 px-2 py-1 text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {open ? (
            <>
              Close

              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Bridge

              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {/* AMOUNT INFO */}
      {/* <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50">
              Missing Amount
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              ~
              {bridgeAmount.toFixed(
                2
              )}{" "}
              USDC
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-white/40">
              Includes buffer
            </p>

            <p className="text-sm text-yellow-300">
              +0.10
            </p>
          </div>
        </div>
      </div> */}

      {/* CONTENT */}
      {open && (
        <div className="mt-5 space-y-5 rounded-3xl border border-white/10 bg-black/20 p-5">
          {/* CHAIN SELECTION */}
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
                            Bridge USDC from{" "}
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
                  {renderStatus()}
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

          {/* ACTION */}
          <button
            onClick={
              handleBridge
            }
            disabled={
              bridging ||
              bridgeAmount <=
                0
            }
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-5 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bridging ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />

                Bridging...
              </div>
            ) : (
              `Bridge ~${bridgeAmount.toFixed(2)} USDC`
            )}
          </button>
        </div>
      )}
    </div>
  );
}