"use client";

import { useState } from "react";

import { useAccount } from "wagmi";

import { z } from "zod";

import sanitizeHtml from "sanitize-html";

import WalletButton from "@/components/wallet/connect-button";

import { supabase } from "@/lib/supabase/client";

import { QRCodeCanvas } from "qrcode.react";

import { toast } from "sonner";

import { paymentSchema } from "@/validations/payment";

export default function CreatePage() {
  const { address, isConnected } =
    useAccount();

  const [recipient, setRecipient] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [memo, setMemo] =
    useState("");

  const [link, setLink] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const createRequest = async () => {
    // WALLET CHECK
    if (!address) {
      toast.error(
        "Connect wallet first"
      );

      return;
    }

    // SANITIZE MEMO
    const cleanMemo =
      sanitizeHtml(memo, {
        allowedTags: [],
        allowedAttributes: {},
      });

    // VALIDATE
    const parsed =
      paymentSchema.safeParse({
        recipient_wallet:
          recipient,

        amount:
          Number(amount),

        memo: cleanMemo,
      });

    if (!parsed.success) {
      toast.error(
        parsed.error.errors[0].message
      );

      return;
    }

    try {
      setLoading(true);

      const { data, error } =
        await supabase
          .from(
            "payment_requests"
          )
          .insert({
            creator_wallet:
              address,

            recipient_wallet:
              recipient,

            amount:
              Number(amount),

            memo:
              cleanMemo || null,

            status: "pending",

            expires_at:
              new Date(
                Date.now() +
                  2 *
                    60 *
                    60 *
                    1000
              ).toISOString(),
          })
          .select()
          .single();

      if (error) {
        console.error(error);

        toast.error(
          "Failed to create payment request"
        );

        return;
      }

      const generatedLink = `${window.location.origin}/pay/${data.id}`;

      setLink(generatedLink);

      toast.success(
        "Payment request created"
      );
    } catch (err) {
      console.error(err);

      toast.error(
        "Unexpected error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Create Payment Request
      </h1>

      {/* WALLET SECTION */}
      {!isConnected ? (
        <div className="p-4 border rounded">
          <p className="mb-2">
            Connect wallet to continue
          </p>

          <WalletButton />
        </div>
      ) : (
        <div className="text-sm text-green-600">
          Connected:{" "}
          {address?.slice(0, 6)}
          ...
          {address?.slice(-4)}
        </div>
      )}

      {/* FORM */}
      <div className="space-y-3">
        <input
          placeholder="Recipient wallet"
          value={recipient}
          onChange={(e) =>
            setRecipient(
              e.target.value
            )
          }
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Amount (USDC)"
          value={amount}
          onChange={(e) =>
            setAmount(
              e.target.value
            )
          }
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Memo (optional)"
          value={memo}
          onChange={(e) =>
            setMemo(
              e.target.value
            )
          }
          className="w-full border p-2 rounded"
        />
      </div>

      {/* BUTTON */}
      <button
        onClick={createRequest}
        disabled={
          !isConnected || loading
        }
        className="bg-black text-white px-4 py-2 rounded w-full disabled:opacity-50"
      >
        {loading
          ? "Creating..."
          : "Create Payment Request"}
      </button>

      {/* RESULT */}
      {link && (
        <div className="p-4 border rounded bg-gray-50 space-y-4">
          <p className="font-medium">
            Shareable Payment Link
          </p>

          <code className="break-all text-sm">
            {link}
          </code>

          {/* QR CODE */}
          <div className="flex justify-center">
            <QRCodeCanvas
              value={link}
              size={180}
            />
          </div>

          <p className="text-xs text-gray-500 text-center">
            Scan QR or share link
            to receive payment
          </p>
        </div>
      )}
    </div>
  );
}