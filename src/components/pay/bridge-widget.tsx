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

type Props = {
  open: boolean;
  onToggle: () => void;
  amount: number;
  wallet?: string;

  // optional callback later
  onBridgeSuccess?: () => void;
};

const chains = [
  {
    id: "base",
    name: "Base",
    speed: "Fast",
  },

  {
    id: "arbitrum",
    name: "Arbitrum",
    speed: "Fast",
  },

  {
    id: "ethereum",
    name: "Ethereum",
    speed: "Slower",
  },
];

export default function BridgeWidget({
  open,
  onToggle,
  amount,
  wallet,
  onBridgeSuccess,
}: Props) {
  const [
    selectedChain,
    setSelectedChain,
  ] = useState("base");

  const [
    bridging,
    setBridging,
  ] = useState(false);

  const [
    bridgeStatus,
    setBridgeStatus,
  ] = useState<
    | "idle"
    | "preparing"
    | "bridging"
    | "completed"
  >("idle");

  const handleBridge = async () => {
    try {
      if (!wallet) {
        toast.error(
          "Connect wallet first"
        );

        return;
      }

      setBridging(true);

      setBridgeStatus(
        "preparing"
      );

      toast.info(
        `Preparing bridge from ${selectedChain}...`
      );

      /*
        STEP 1:
        Ask backend to prepare bridge
      */
      const res = await fetch(
        "/api/bridge",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fromChain:
              selectedChain,

            amount,

            wallet,
          }),
        }
      );

      const data =
        await res.json();

      console.log(
        "Bridge route response:",
        data
      );

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to initialize bridge"
        );
      }

      /*
        IMPORTANT:

        We are NO LONGER manually
        executing depositForBurn here.

        Arc SDK / bridge orchestration
        will handle:
        - burn
        - attestation
        - mint
        - relay
      */

      setBridgeStatus(
        "bridging"
      );

      toast.success(
        "Bridge initialized"
      );

      /*
        TEMP MOCK FLOW

        Simulate bridge completion.

        Later:
        - poll Arc bridge status
        - wait for destination mint
        - refetch balance
        - auto-trigger payment
      */

      setTimeout(() => {
        setBridgeStatus(
          "completed"
        );

        toast.success(
          "Funds arrived on Arc"
        );

        onBridgeSuccess?.();

        onToggle();
      }, 5000);
    } catch (err) {
      console.error(err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Bridge failed"
      );

      setBridgeStatus("idle");
    } finally {
      setBridging(false);
    }
  };

  return (
    <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5 text-left">
      {/* TOP */}
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
            on Arc to complete this
            payment.
          </p>

          <p className="mt-1 text-sm text-white/50">
            Bridge funds from another
            chain and continue
            seamlessly.
          </p>
        </div>

        <button
          onClick={onToggle}
          className="flex items-center gap-2 rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
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

      {/* EXPANDED */}
      {open && (
        <div className="mt-5 space-y-5 rounded-3xl border border-white/10 bg-black/20 p-5">
          {/* HEADER */}
          <div>
            <p className="text-sm font-medium text-white">
              Choose Source Chain
            </p>

            <p className="mt-1 text-xs text-white/50">
              One bridge transaction
              will fund your Arc wallet
              and complete the payment.
            </p>
          </div>

          {/* CHAINS */}
          <div className="space-y-3">
            {chains.map((chain) => {
              const active =
                selectedChain ===
                chain.id;

              return (
                <button
                  key={chain.id}
                  onClick={() =>
                    setSelectedChain(
                      chain.id
                    )
                  }
                  disabled={
                    bridging
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
                        <p className="font-medium">
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
            })}
          </div>

          {/* STATUS */}
          {bridgeStatus !==
            "idle" && (
            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
              {bridgeStatus ===
                "preparing" && (
                <div className="flex items-center gap-2 text-sm text-fuchsia-200">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Preparing bridge
                  transaction...
                </div>
              )}

              {bridgeStatus ===
                "bridging" && (
                <div className="flex items-center gap-2 text-sm text-fuchsia-200">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  Bridging funds to
                  Arc...
                </div>
              )}

              {bridgeStatus ===
                "completed" && (
                <div className="flex items-center gap-2 text-sm text-green-300">
                  <Check className="h-4 w-4" />

                  Funds received on
                  Arc.
                </div>
              )}
            </div>
          )}

          {/* INFO */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="mt-0.5 h-4 w-4 text-white/40" />

              <div>
                <p className="text-sm text-white/80">
                  Powered by Circle
                  CCTP + Arc Bridge
                </p>

                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  Funds are bridged
                  securely and arrive
                  directly on Arc for
                  payment completion.
                </p>
              </div>
            </div>
          </div>

          {/* ACTION */}
          <button
            onClick={handleBridge}
            disabled={
              bridging
            }
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