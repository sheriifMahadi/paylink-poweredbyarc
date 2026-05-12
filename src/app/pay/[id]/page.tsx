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

import { publicClient } from "@/lib/web3/wagmi";

import { supabase } from "@/lib/supabase/client";

import WalletButton from "@/components/wallet/connect-button";

import { toast } from "sonner";

import type { PaymentRequest } from "@/types/payment";

const shortAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const explorerUrl = (hash: string) =>
  `https://explorer.arc.net/tx/${hash}`;

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

  const { data: balance } =
    useBalance({
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

  const [timeLeft, setTimeLeft] =
    useState("");

  const ARC_CHAIN_ID = Number(
    process.env.NEXT_PUBLIC_ARC_CHAIN_ID
  );

  const wrongNetwork =
    chainId !== ARC_CHAIN_ID;

  const USDC_ABI = parseAbi([
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);

  // REALTIME UPDATES
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

  // FETCH REQUEST
  useEffect(() => {
    const fetchRequest = async () => {
      const { data, error } =
        await supabase
          .from("payment_requests")
          .select("*")
          .eq("id", id)
          .single();

      if (error) {
        console.error(error);

        setLoading(false);

        return;
      }

      // AUTO EXPIRE
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

  // COUNTDOWN TIMER
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
      const diff =
        new Date(
          request.expires_at
        ).getTime() - Date.now();

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

  // PAYMENT ENGINE
  const handlePay = async () => {
    if (!request || !address)
      return;

    try {
      setPaying(true);

      // ALLOW SELF PAYMENTS
      // intentionally no self-wallet restriction

      // PREVENT DUPLICATE PAYMENTS
      if (
        request.status !== "pending"
      ) {
        toast.error(
          "Payment already resolved"
        );

        return;
      }

      // EXPIRED CHECK
      if (
        request.expires_at &&
        new Date(
          request.expires_at
        ).getTime() < Date.now()
      ) {
        toast.error(
          "Payment request expired"
        );

        await supabase
          .from("payment_requests")
          .update({
            status: "expired",
          })
          .eq("id", request.id);

        return;
      }

      // NETWORK ENFORCEMENT
      if (wrongNetwork) {
        await switchChainAsync({
          chainId: ARC_CHAIN_ID,
        });
      }

      // BALANCE CHECK
      if (
        balance &&
        Number(balance.formatted) <
          Number(request.amount)
      ) {
        toast.error(
          "Insufficient USDC balance"
        );

        return;
      }

      // SET PROCESSING STATE
      await supabase
        .from("payment_requests")
        .update({
          status: "processing",
        })
        .eq("id", request.id);

      // SEND TRANSACTION
      const txHash =
        await writeContractAsync({
          address:
            process.env
              .NEXT_PUBLIC_USDC_CONTRACT as `0x${string}`,

          abi: USDC_ABI,

          functionName: "transfer",

          args: [
            request.recipient_wallet as `0x${string}`,
            BigInt(
              Math.floor(
                Number(
                  request.amount
                ) * 1_000_000
              )
            ),
          ],
        });

      toast.info(
        "Transaction submitted"
      );

      // WAIT FOR CONFIRMATION
      await waitForTransactionReceipt(
        publicClient,
        {
          hash: txHash,
        }
      );

      // UPDATE DATABASE
      await supabase
        .from("payment_requests")
        .update({
          status: "paid",

          tx_hash: txHash,

          paid_by: address,

          paid_at:
            new Date().toISOString(),
        })
        .eq("id", request.id);

      toast.success(
        "Payment completed"
      );
    } catch (err) {
      console.error(err);

      // FAILED STATE
      await supabase
        .from("payment_requests")
        .update({
          status: "failed",
        })
        .eq("id", request?.id);

      toast.error("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  // LOADING
  if (loading) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  // NOT FOUND
  if (!request) {
    return (
      <div className="p-6">
        Request not found
      </div>
    );
  }

  // PAYMENT LOCK
  const paymentLocked =
    request.status === "paid" ||
    request.status === "expired" ||
    request.status ===
      "cancelled";

  // STATUS COLORS
  const statusColors: Record<
    string,
    string
  > = {
    pending:
      "bg-yellow-100 text-yellow-700",

    processing:
      "bg-blue-100 text-blue-700",

    paid:
      "bg-green-100 text-green-700",

    expired:
      "bg-red-100 text-red-700",

    cancelled:
      "bg-gray-200 text-gray-700",

    failed:
      "bg-orange-100 text-orange-700",
  };

  return (
    <div className="max-w-xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Payment Request
      </h1>

      {/* STATUS */}
      <div
        className={`px-3 py-1 rounded text-sm inline-block ${
          statusColors[
            request.status
          ] ||
          "bg-gray-100 text-gray-700"
        }`}
      >
        {request.status.toUpperCase()}
      </div>

      {/* DETAILS */}
      <div className="border p-4 rounded space-y-2">
        <p>
          <strong>To:</strong>{" "}
          {shortAddress(
            request.recipient_wallet
          )}
        </p>

        <p>
          <strong>Amount:</strong>{" "}
          {request.amount} USDC
        </p>

        {request.memo && (
          <p>
            <strong>Memo:</strong>{" "}
            {request.memo}
          </p>
        )}

        {timeLeft && (
          <p className="text-sm text-gray-500">
            Expires in: {timeLeft}
          </p>
        )}

        {request.tx_hash && (
          <div className="pt-2">
            <a
              href={explorerUrl(
                request.tx_hash
              )}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 underline break-all text-sm"
            >
              View Transaction
            </a>
          </div>
        )}
      </div>

      {/* EXPIRED WARNING */}
      {request.status ===
        "expired" && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          This payment request has
          expired
        </div>
      )}

      {/* WRONG NETWORK */}
      {wrongNetwork &&
        isConnected && (
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded">
            Wrong network detected.
            Please switch to Arc.
          </div>
        )}

      {/* WALLET */}
      {!isConnected ? (
        <WalletButton />
      ) : (
        <p className="text-sm">
          Connected:{" "}
          {address &&
            shortAddress(address)}
        </p>
      )}

      {/* BALANCE */}
      {balance && (
        <div className="text-sm text-gray-500">
          Balance:{" "}
          {Number(
            balance.formatted
          ).toFixed(2)}{" "}
          {balance.symbol}
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
        className="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-50"
      >
        {paying
          ? "Processing..."
          : request.status ===
            "paid"
          ? "Already Paid"
          : request.status ===
            "expired"
          ? "Expired"
          : request.status ===
            "processing"
          ? "Processing..."
          : "Pay Now"}
      </button>
    </div>
  );
}