"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";

import { supabase } from "@/lib/supabase/client";
import WalletButton from "@/components/wallet/connect-button";

export default function PayPage() {
  const { id } = useParams();

  const { address, isConnected } = useAccount();

  const [request, setRequest] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  const [paying, setPaying] = useState(false);

  const [timeLeft, setTimeLeft] = useState("");

  // FETCH REQUEST
  useEffect(() => {
    const fetchRequest = async () => {
      const { data, error } = await supabase
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
        new Date(data.expires_at).getTime() < Date.now();

      if (isExpired && data.status === "pending") {
        await supabase
          .from("payment_requests")
          .update({
            status: "expired",
          })
          .eq("id", data.id);

        data.status = "expired";
      }

      setRequest(data);

      setLoading(false);
    };

    if (id) fetchRequest();
  }, [id]);

  // COUNTDOWN TIMER
 useEffect(() => {
  if (!request?.expires_at) return;

  // STOP TIMER FOR FINAL STATES
  if (
    request.status === "paid" ||
    request.status === "expired" ||
    request.status === "cancelled"
  ) {
    setTimeLeft("");

    return;
  }

  const interval = setInterval(() => {
    const diff =
      new Date(request.expires_at).getTime() -
      Date.now();

    if (diff <= 0) {
      setTimeLeft("Expired");

      clearInterval(interval);

      return;
    }

    const hours = Math.floor(
      diff / (1000 * 60 * 60)
    );

    const mins = Math.floor(
      (diff % (1000 * 60 * 60)) /
        (1000 * 60)
    );

    const secs = Math.floor(
      (diff % (1000 * 60)) / 1000
    );

    setTimeLeft(
      `${hours}h ${mins}m ${secs}s`
    );
  }, 1000);

  return () => clearInterval(interval);
}, [request]);

  // MOCK PAYMENT ENGINE
  const handlePay = async () => {
    if (!request || !address) return;

    try {
      setPaying(true);

      await supabase
        .from("payment_requests")
        .update({
          status: "paid",
          tx_hash:
            "mock_tx_" + Date.now(),
          paid_by: address,
          paid_at:
            new Date().toISOString(),
        })
        .eq("id", request.id);

      setRequest({
        ...request,
        status: "paid",
      });

      alert("Payment completed");
    } catch (err) {
      console.error(err);

      alert("Payment failed");
    } finally {
      setPaying(false);
    }
  };

  // LOADING
  if (loading) {
    return <div className="p-6">Loading...</div>;
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
    request.status === "cancelled";

  // STATUS COLORS
  const statusColors: Record<
    string,
    string
  > = {
    pending:
      "bg-yellow-100 text-yellow-700",

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
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Payment Request
      </h1>

      {/* STATUS */}
      <div
        className={`px-3 py-1 rounded text-sm inline-block ${statusColors[request.status]}`}
      >
        {request.status.toUpperCase()}
      </div>

      {/* DETAILS */}
      <div className="border p-4 rounded space-y-2">
        <p>
          <strong>To:</strong>{" "}
          {request.recipient_wallet}
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

        <p className="text-sm text-gray-500">
          Expires in: {timeLeft}
        </p>
      </div>

      {/* EXPIRED WARNING */}
      {request.status === "expired" && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          This payment request has expired
        </div>
      )}

      {/* WALLET */}
      {!isConnected ? (
        <WalletButton />
      ) : (
        <p className="text-sm">
          Connected:{" "}
          {address?.slice(0, 6)}...
          {address?.slice(-4)}
        </p>
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
          : request.status === "paid"
          ? "Already Paid"
          : request.status === "expired"
          ? "Expired"
          : "Pay Now"}
      </button>
    </div>
  );
}