"use client";

import { useEffect, useState } from "react";

import { useParams } from "next/navigation";

import {
  useAccount,
  useBalance,
  useChainId,
  useSwitchChain,
  useWriteContract,
} from "wagmi";

import { parseAbi } from "viem";

import { waitForTransactionReceipt } from "viem/actions";

import {
  Wallet,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Clock3,
} from "lucide-react";

import { publicClient } from "@/lib/web3/wagmi";

import { supabase } from "@/lib/supabase/client";

import { toast } from "sonner";

import type { PaymentRequest } from "@/types/payment";

import GlassCard from "@/components/ui/glass-card";

import PageContainer from "@/components/ui/page-container";

import WalletButton from "@/components/wallet/connect-button";

import BridgeWidget from "@/components/pay/bridge-widget";

const shortAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const shortHash = (hash: string) =>
  `${hash.slice(0, 10)}...${hash.slice(-8)}`;

const explorerUrl = (hash: string) =>
  `https://testnet.arcscan.app/tx/${hash}`;

export default function PayPage() {
  const params = useParams();

  const id =
    typeof params.id === "string"
      ? params.id
      : params.id?.[0];

  const { address, isConnected } =
    useAccount();

  const chainId = useChainId();

  const { switchChainAsync } =
    useSwitchChain();

  const { writeContractAsync } =
    useWriteContract();

  const {
    data: balance,
    refetch: refetchBalance,
  } = useBalance({
    address,
    token:
      process.env
        .NEXT_PUBLIC_USDC_CONTRACT as `0x${string}`,
  });

  const [request, setRequest] =
    useState<PaymentRequest | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [paying, setPaying] =
    useState(false);

  const [cancelling, setCancelling] =
    useState(false);

  const [timeLeft, setTimeLeft] =
    useState("");

  const [bridgeOpen, setBridgeOpen] =
    useState(false);

  const ARC_CHAIN_ID = Number(
    process.env.NEXT_PUBLIC_ARC_CHAIN_ID
  );

  const wrongNetwork =
    chainId !== ARC_CHAIN_ID;

  const USDC_ABI = parseAbi([
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);

  const isCreator =
    !!address &&
    !!request &&
    address.toLowerCase() ===
      request.creator_wallet.toLowerCase();

  // REALTIME
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`payment-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payment_requests",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setRequest(
            payload.new as PaymentRequest
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // FETCH
  useEffect(() => {
    const fetchRequest = async () => {
      const { data, error } =
        await supabase
          .from("payment_requests")
          .select("*")
          .eq("id", id)
          .single();

      if (error || !data) {
        setLoading(false);

        return;
      }

      const isExpired =
        data.expires_at &&
        new Date(
          data.expires_at
        ).getTime() < Date.now();

      if (
        isExpired &&
        data.status === "pending"
      ) {
        await supabase
          .from("payment_requests")
          .update({
            status: "expired",
          })
          .eq("id", data.id);

        data.status = "expired";
      }

      setRequest(
        data as PaymentRequest
      );

      setLoading(false);
    };

    if (id) {
      fetchRequest();
    }
  }, [id]);

  // TIMER
  useEffect(() => {
    if (!request?.expires_at) return;

    if (
      request.status === "paid" ||
      request.status === "expired" ||
      request.status ===
        "cancelled"
    ) {
      setTimeLeft("");

      return;
    }

    const interval = setInterval(() => {
      if (!request.expires_at) return;

      const expiresAt =
        new Date(
          request.expires_at
        ).getTime();

      if (isNaN(expiresAt)) return;

      const diff =
        expiresAt - Date.now();

      if (diff <= 0) {
        setTimeLeft("Expired");

        clearInterval(interval);

        return;
      }

      const hours = Math.floor(
        diff / (1000 * 60 * 60)
      );

      const mins = Math.floor(
        (diff %
          (1000 * 60 * 60)) /
          (1000 * 60)
      );

      const secs = Math.floor(
        (diff % (1000 * 60)) /
          1000
      );

      setTimeLeft(
        `${hours}h ${mins}m ${secs}s`
      );
    }, 1000);

    return () =>
      clearInterval(interval);
  }, [request]);

  // CANCEL
  const handleCancel = async () => {
    if (!request || !address)
      return;

    try {
      setCancelling(true);

      if (!isCreator) {
        toast.error(
          "Only creator can cancel"
        );

        return;
      }

      if (
        request.status !== "pending"
      ) {
        toast.error(
          "Cannot cancel request"
        );

        return;
      }

      const { data, error } =
        await supabase
          .from("payment_requests")
          .update({
            status: "cancelled",
          })
          .eq("id", request.id)
          .eq("status", "pending")
          .select();

      if (
        error ||
        !data ||
        data.length === 0
      ) {
        toast.error(
          "Failed to cancel"
        );

        return;
      }

      setRequest(
        data[0] as PaymentRequest
      );

      toast.success(
        "Payment request cancelled"
      );
    } finally {
      setCancelling(false);
    }
  };

  // PAY
  const handlePay = async () => {
    if (!request) {
      toast.error(
        "Payment request not found"
      );

      return;
    }

    if (!address || !isConnected) {
      toast.error(
        "Connect your wallet first"
      );

      return;
    }

    try {
      setPaying(true);

      const {
        data: freshRequest,
      } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("id", request.id)
        .single();

      if (
        !freshRequest ||
        freshRequest.status !==
          "pending"
      ) {
        toast.error(
          "Payment unavailable"
        );

        return;
      }

      if (
        freshRequest.expires_at &&
        new Date(
          freshRequest.expires_at
        ).getTime() < Date.now()
      ) {
        await supabase
          .from("payment_requests")
          .update({
            status: "expired",
          })
          .eq("id", freshRequest.id);

        toast.error(
          "Request expired"
        );

        return;
      }

      if (wrongNetwork) {
        toast.info(
          "Switching to Arc network..."
        );

        await switchChainAsync({
          chainId: ARC_CHAIN_ID,
        });
      }

      const userBalance = Number(
        balance?.formatted ?? "0"
      );

      const paymentAmount =
        Number(
          freshRequest.amount
        );

      if (
        Number.isNaN(userBalance)
      ) {
        toast.error(
          "Unable to verify wallet balance"
        );

        return;
      }

      if (
        userBalance <
        paymentAmount
      ) {
        setBridgeOpen(true);

        toast.error(
          `Insufficient balance. Bridge USDC to continue`
        );

        return;
      }

      const {
        data: lockedRows,
      } = await supabase
        .from("payment_requests")
        .update({
          status: "processing",
        })
        .eq("id", freshRequest.id)
        .eq("status", "pending")
        .select();

      if (
        !lockedRows ||
        lockedRows.length === 0
      ) {
        toast.error(
          "Payment already processing"
        );

        return;
      }

      setRequest({
        ...freshRequest,
        status: "processing",
      });

      const txHash =
        await writeContractAsync({
          address:
            process.env
              .NEXT_PUBLIC_USDC_CONTRACT as `0x${string}`,

          abi: USDC_ABI,

          functionName:
            "transfer",

          args: [
            freshRequest.recipient_wallet as `0x${string}`,

            BigInt(
              Math.floor(
                Number(
                  freshRequest.amount
                ) * 1_000_000
              )
            ),
          ],
        });

      toast.success(
        "Transaction submitted"
      );

      const receipt =
        await waitForTransactionReceipt(
          publicClient,
          {
            hash: txHash,
          }
        );

      if (
        !receipt ||
        receipt.status !==
          "success"
      ) {
        await supabase
          .from("payment_requests")
          .update({
            status: "pending",
          })
          .eq("id", freshRequest.id);

        setRequest({
          ...freshRequest,
          status: "pending",
        });

        toast.error(
          "Transaction failed"
        );

        return;
      }

      const paidAt =
        new Date().toISOString();

      await supabase
        .from("payment_requests")
        .update({
          status: "paid",
          tx_hash: txHash,
          paid_by: address,
          paid_at: paidAt,
        })
        .eq("id", freshRequest.id);

      setRequest({
        ...freshRequest,
        status: "paid",
        tx_hash: txHash,
        paid_by: address,
        paid_at: paidAt,
      });

      await refetchBalance();

      toast.success(
        "Payment completed",
        {
          description:
            shortHash(txHash),
        }
      );
    } catch (err: unknown) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "";

      if (
        message
          .toLowerCase()
          .includes("rejected")
      ) {
        toast.error(
          "Transaction rejected"
        );
      } else {
        toast.error(
          message ||
            "Payment failed"
        );
      }

      if (request?.id) {
        await supabase
          .from("payment_requests")
          .update({
            status: "pending",
          })
          .eq("id", request.id)
          .eq("status", "processing");

        setRequest({
          ...request,
          status: "pending",
        });
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-fuchsia-400" />
        </div>
      </PageContainer>
    );
  }

  if (!request) {
    return (
      <PageContainer>
        <GlassCard>
          <div className="py-10 text-center">
            Request not found
          </div>
        </GlassCard>
      </PageContainer>
    );
  }

  const paymentLocked =
    request.status === "paid" ||
    request.status === "expired" ||
    request.status ===
      "cancelled";

  const insufficientBalance =
    !!balance &&
    !!request &&
    Number(balance.formatted) <
      Number(request.amount);

  const statusMap = {
    pending: {
      icon: Clock3,
      className:
        "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    },

    processing: {
      icon: Loader2,
      className:
        "bg-blue-500/10 text-blue-300 border-blue-500/20",
    },

    paid: {
      icon: CheckCircle2,
      className:
        "bg-green-500/10 text-green-300 border-green-500/20",
    },

    expired: {
      icon: AlertTriangle,
      className:
        "bg-red-500/10 text-red-300 border-red-500/20",
    },

    cancelled: {
      icon: XCircle,
      className:
        "bg-gray-500/10 text-gray-300 border-gray-500/20",
    },
  };

  const status =
    statusMap[
      request.status as keyof typeof statusMap
    ];

  const StatusIcon =
    status?.icon || Clock3;

  return (
    <PageContainer>
      <div className="relative space-y-8">
        <div className="pointer-events-none absolute -top-20 left-0 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />

        <div className="pointer-events-none absolute top-40 right-0 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />

        <GlassCard>
          <div className="space-y-8 text-center">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${status.className}`}
            >
              <StatusIcon
                className={`h-4 w-4 ${
                  request.status ===
                  "processing"
                    ? "animate-spin"
                    : ""
                }`}
              />

              {request.status.toUpperCase()}
            </div>

            <div>
              <p className="mb-2 text-sm text-white/50">
                Payment Request
              </p>

              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
                {request.amount}

                <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {" "}
                  USDC
                </span>
              </h1>
            </div>

            <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-fuchsia-500/10 p-3">
                  <Wallet className="h-5 w-5 text-fuchsia-300" />
                </div>

                <div className="text-left">
                  <p className="text-xs text-white/50">
                    Recipient Wallet
                  </p>

                  <p className="font-medium">
                    {shortAddress(
                      request.recipient_wallet
                    )}
                  </p>
                </div>
              </div>
            </div>

            {request.memo && (
              <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-black/20 p-5 text-left">
                <p className="mb-2 text-xs text-white/50">
                  Memo
                </p>

                <p className="leading-relaxed text-white/80">
                  {request.memo}
                </p>
              </div>
            )}

            {timeLeft && (
              <div className="mx-auto max-w-sm rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-5">
                <div className="flex items-center justify-center gap-3">
                  <Clock3 className="h-5 w-5 text-fuchsia-300" />

                  <div>
                    <p className="text-xs text-white/50">
                      Expires In
                    </p>

                    <p className="text-lg font-semibold text-fuchsia-300">
                      {timeLeft}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* BRIDGE WIDGET */}
            {isConnected &&
              request.status ===
                "pending" &&
              insufficientBalance && (
                <div className="fixed bottom-4 right-4 z-50 w-72">
                  <BridgeWidget
                    open={bridgeOpen}
                    onToggle={() =>
                      setBridgeOpen(
                        !bridgeOpen
                      )
                    }
                    amount={Number(
                      request.amount
                    )}
                    wallet={address}
                  />
                </div>
              )}

            {/* PAY BUTTON */}
            <button
              onClick={handlePay}
              disabled={
                !isConnected ||
                paying ||
                paymentLocked
              }
              className="w-full rounded-3xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-6 py-5 text-lg font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paying ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />

                  Processing Payment...
                </div>
              ) : request.status ===
                "paid" ? (
                "Payment Completed"
              ) : request.status ===
                "expired" ? (
                "Request Expired"
              ) : request.status ===
                "cancelled" ? (
                "Request Cancelled"
              ) : insufficientBalance ? (
                "Bridge & Pay"
              ) : (
                "Pay Now"
              )}
            </button>

            {/* CANCEL */}
            {request.status ===
              "pending" &&
              isCreator && (
                <button
                  onClick={
                    handleCancel
                  }
                  disabled={
                    cancelling
                  }
                  className="w-full rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-4 font-medium text-red-300 transition hover:bg-red-500/20"
                >
                  {cancelling
                    ? "Cancelling..."
                    : "Cancel Request"}
                </button>
              )}
          </div>
        </GlassCard>

        {/* WALLET */}
        {isConnected && (
          <GlassCard>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-white/50">
                  Connected Wallet
                </p>

                <p className="mt-1 font-medium">
                  {address &&
                    shortAddress(
                      address
                    )}
                </p>
              </div>

              {balance && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
                  <p className="text-xs text-white/50">
                    Balance
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {Number(
                      balance.formatted
                    ).toFixed(2)}{" "}
                    {
                      balance.symbol
                    }
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* WRONG NETWORK */}
        {wrongNetwork &&
          isConnected && (
            <GlassCard>
              <div className="flex items-center gap-3 text-yellow-300">
                <AlertTriangle className="h-5 w-5" />

                Wrong network detected.
                Please switch to Arc.
              </div>
            </GlassCard>
          )}

        {/* TX HASH */}
        {request.tx_hash && (
          <GlassCard>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-white/50">
                  Transaction Hash
                </p>

                <p className="mt-1 break-all font-medium">
                  {shortHash(
                    request.tx_hash
                  )}
                </p>
              </div>

              <a
                href={explorerUrl(
                  request.tx_hash
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
              >
                View on Explorer

                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </GlassCard>
        )}

        {/* CONNECT */}
        {!isConnected && (
          <GlassCard>
            <div className="space-y-4 text-center">
              <p className="text-white/70">
                Connect wallet to make
                payment
              </p>

              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </PageContainer>
  );
}