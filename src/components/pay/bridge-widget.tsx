"use client";

import { useState } from "react";

import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from "lucide-react";

import { toast } from "sonner";

type Props = {
  open: boolean;
  onToggle: () => void;
  amount: number;
  wallet?: string;
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
}: Props) {
  const [
    selectedChain,
    setSelectedChain,
  ] = useState<string>("base");

  const [
    bridging,
    setBridging,
  ] = useState(false);

  const handleBridge = async () => {
    try {
      if (!wallet) {
        toast.error(
          "Connect wallet first"
        );

        return;
      }

      setBridging(true);

      toast.info(
        "Preparing bridge..."
      );

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

      console.log(data);

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Bridge failed"
        );
      }

      toast.success(
        "Bridge initialized"
      );
    } catch (err) {
      console.error(err);

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
            on Arc to complete this payment.
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

      {open && (
        <div className="mt-5 space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
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
            })}
          </div>

          {/* FOOTER */}
          <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
            <p className="text-sm text-fuchsia-200">
              Your payment will
              continue automatically
              once funds arrive on
              Arc.
            </p>
          </div>

          {/* ACTION */}
          <button
            onClick={handleBridge}
            disabled={bridging}
            className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-5 py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {bridging ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />

                Preparing Bridge...
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