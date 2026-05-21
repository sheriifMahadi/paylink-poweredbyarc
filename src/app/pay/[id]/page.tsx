"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

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
import PaymentActionButton from "@/components/pay/payment-action-button";

const shortAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const shortHash = (hash: string) =>
  `${hash.slice(0, 10)}...${hash.slice(-8)}`;

const explorerUrl = (hash: string) =>
  `https://testnet.arcscan.app/tx/${hash}`;

export default function PayPage() {
  /*
    HOOKS
  */
  const params = useParams();

  const { address, isConnected } =
    useAccount();

  const chainId =
    useChainId();

  const { switchChainAsync } =
    useSwitchChain();

  const { writeContractAsync } =
    useWriteContract();

  /*
    PARAMS
  */
  const id =
    typeof params.id === "string"
      ? params.id
      : params.id?.[0];

  /*
    BALANCE
  */
  const {
    data: balance,
    refetch: refetchBalance,
  } = useBalance({
    address,
    token:
      process.env
        .NEXT_PUBLIC_USDC_CONTRACT as `0x${string}`,
  });

  // Manual balance polling
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (address) {
        refetchBalance();
      }
    }, 10000); // Refetch every 10 seconds

    return () => clearInterval(intervalId);
  }, [address, refetchBalance]);

  /*
    STATE
  */
  const [loading, setLoading] =
    useState(true);

  const [request, setRequest] =
    useState<PaymentRequest | null>(
      null
    );

  const [paying, setPaying] =
    useState(false);

  const [cancelling, setCancelling] =
    useState(false);

  const [bridgeOpen, setBridgeOpen] =
    useState(false);

  const [bridging, setBridging] =
    useState(false);

  const [timeLeft, setTimeLeft] =
    useState("");

  /*
    CONSTANTS
  */
  const ARC_CHAIN_ID = Number(
    process.env.NEXT_PUBLIC_ARC_CHAIN_ID
  );

  const wrongNetwork =
    chainId !== ARC_CHAIN_ID;

  const USDC_ABI = parseAbi([
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);

  /*
    DERIVED
  */
  /*
    Prevent temporary wagmi undefined balance
    from resetting to zero during rerenders.
  */
  const [stableBalance, setStableBalance] =
    useState(0);

  useEffect(() => {
    if (balance?.formatted) {
      setStableBalance(
        Number(balance.formatted)
      );
    }
  }, [balance?.formatted]);

  const currentBalance = stableBalance;

  const paymentAmount = Number(
    request?.amount ?? "0"
  );

  const missingAmount =
    paymentAmount > currentBalance
      ? Number(
          (
            paymentAmount -
            currentBalance
          ).toFixed(6)
        )
      : 0;

  const insufficientBalance =
    !!request &&
    request.status === "pending" &&
    missingAmount > 0;

  const paymentLocked =
    request?.status === "paid" ||
    request?.status === "expired" ||
    request?.status === "cancelled";

  const isCreator =
    !!address &&
    !!request &&
    address.toLowerCase() ===
      request.creator_wallet.toLowerCase();

  /*
    REALTIME
  */
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

  /*
    FETCH
  */
  useEffect(() => {
    const fetchRequest =
      async () => {
        const { data, error } =
          await supabase
            .from(
              "payment_requests"
            )
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
          ).getTime() <
            Date.now();

        if (
          isExpired &&
          data.status ===
            "pending"
        ) {
          await supabase
            .from(
              "payment_requests"
            )
            .update({
              status:
                "expired",
            })
            .eq("id", data.id);

          data.status =
            "expired";
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

  /*
    TIMER
  */
  useEffect(() => {
    if (!request?.expires_at)
      return;

    if (
      request.status ===
        "paid" ||
      request.status ===
        "expired" ||
      request.status ===
        "cancelled"
    ) {
      setTimeLeft("");

      return;
    }

    const interval =
      setInterval(() => {
        const expiresAt =
          new Date(
            request.expires_at!
          ).getTime();

        const diff =
          expiresAt -
          Date.now();

        if (diff <= 0) {
          setTimeLeft(
            "Expired"
          );

          clearInterval(
            interval
          );

          return;
        }

        const hours =
          Math.floor(
            diff /
              (1000 *
                60 *
                60)
          );

        const mins =
          Math.floor(
            (diff %
              (1000 *
                60 *
                60)) /
              (1000 *
                60)
          );

        const secs =
          Math.floor(
            (diff %
              (1000 *
                60)) /
              1000
          );

        setTimeLeft(
          `${hours}h ${mins}m ${secs}s`
        );
      }, 1000);

    return () =>
      clearInterval(
        interval
      );
  }, [request]);

  /*
    BRIDGE REFRESH
  */
  const refreshBalanceAfterBridge =
    useCallback(async () => {
      setBridging(true);

      for (
        let i = 0;
        i < 6;
        i++
      ) {
        const refreshed =
          await refetchBalance();

        const nextBalance =
          Number(
            refreshed.data
              ?.formatted ??
              "0"
          );

        if (
          nextBalance >=
          paymentAmount
        ) {
          break;
        }

        await new Promise(
          (
            resolve
          ) =>
            setTimeout(
              resolve,
              4000
            )
        );
      }

      setBridging(false);
    }, [
      paymentAmount,
      refetchBalance,
    ]);

  /*
    CANCEL
  */
  const handleCancel =
    async () => {
      if (
        !request ||
        !address
      )
        return;

      try {
        setCancelling(
          true
        );

        const {
          data,
        } =
          await supabase
            .from(
              "payment_requests"
            )
            .update({
              status:
                "cancelled",
            })
            .eq(
              "id",
              request.id
            )
            .eq(
              "status",
              "pending"
            )
            .select();

        if (
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
        setCancelling(
          false
        );
      }
    };

  /*
    PAY
  */
  const handlePay =
    async () => {
      if (!request)
        return;

      if (
        !address ||
        !isConnected
      ) {
        toast.error(
          "Connect wallet first"
        );

        return;
      }

      try {
        setPaying(true);

        if (
          wrongNetwork
        ) {
          toast.info(
            "Switching to Arc..."
          );

          await switchChainAsync(
            {
              chainId:
                ARC_CHAIN_ID,
            }
          );
        }

        if (
          insufficientBalance ||
          bridging
        ) {
          setBridgeOpen(
            true
          );

          toast.error(
            "Insufficient USDC balance"
          );

          return;
        }

        const txHash =
          await writeContractAsync(
            {
              address:
                process.env
                  .NEXT_PUBLIC_USDC_CONTRACT as `0x${string}`,

              abi: USDC_ABI,

              functionName:
                "transfer",

              args: [
                request.recipient_wallet as `0x${string}`,

                BigInt(
                  Math.round(
                    paymentAmount *
                      1_000_000
                  )
                ),
              ],
            }
          );

        toast.success(
          "Transaction submitted"
        );

        const receipt =
          await waitForTransactionReceipt(
            publicClient,
            {
              hash:
                txHash,
            }
          );

        if (
          receipt.status !==
          "success"
        ) {
          toast.error(
            "Payment failed"
          );

          return;
        }

        await supabase
          .from(
            "payment_requests"
          )
          .update({
            status:
              "paid",
            tx_hash:
              txHash,
            paid_by:
              address,
            paid_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            request.id
          );

        setRequest({
          ...request,
          status:
            "paid",
          tx_hash:
            txHash,
        });

        toast.success(
          "Payment completed"
        );

        await refetchBalance();
      } catch (err) {
        console.error(
          err
        );

        toast.error(
          err instanceof Error
            ? err.message
            : "Payment failed"
        );
      } finally {
        setPaying(false);
      }
    };

  /*
    STATUS MAP
  */
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

  /*
    LOADING
  */
  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin text-fuchsia-400" />
        </div>
      </PageContainer>
    );
  }

  /*
    NOT FOUND
  */
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

  const status =
    statusMap[
      request.status as keyof typeof statusMap
    ];

  const StatusIcon =
    status?.icon ||
    Clock3;

  return (
    <PageContainer>
      <div className="relative space-y-8">
        {/* SMALL FLOATING BRIDGE WIDGET */}
        {isConnected &&
          request.status ===
            "pending" &&
          insufficientBalance && (
            <div className="fixed right-4 top-17 z-50 w-[340px]">
              <BridgeWidget
                open={
                  bridgeOpen
                }
                onToggle={() =>
                  setBridgeOpen(
                    !bridgeOpen
                  )
                }
                amount={
                  missingAmount
                }
            
                wallet={
                  address
                }
                onBridgeSuccess={async () => {
                  await refreshBalanceAfterBridge();
                }}
              />
            </div>
          )}

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

              <h1 className="text-5xl font-bold">
                {
                  request.amount
                }

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
                    Recipient
                  </p>

                  <p className="font-medium">
                    {shortAddress(
                      request.recipient_wallet
                    )}
                  </p>
                </div>
              </div>
            </div>

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

            <PaymentActionButton
              onClick={
                handlePay
              }
              disabled={
                !isConnected ||
                paying ||
                paymentLocked ||
                insufficientBalance ||
                bridging
              }
            >
              {paying ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
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
              ) : (
                "Pay Now"
              )}
            </PaymentActionButton>

            {/* {insufficientBalance && (
              <p className="text-sm text-yellow-300">
                Insufficient USDC on Arc.
                Bridge{" "}
                {missingAmount.toFixed(
                  2
                )}{" "}
                USDC to continue.
              </p>
            )} */}

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

        {isConnected && (
          <GlassCard>
            <div className="flex items-center justify-between">
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
                    ).toFixed(
                      2
                    )}{" "}
                    {
                      balance.symbol
                    }
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        )}

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

        {!isConnected && (
          <GlassCard>
            <div className="space-y-4 text-center">
              <p className="text-white/70">
                Connect wallet to continue
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