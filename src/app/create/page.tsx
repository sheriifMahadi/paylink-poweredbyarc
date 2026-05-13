"use client";

import { useState } from "react";

import { useAccount } from "wagmi";

import sanitizeHtml from "sanitize-html";

import {
  Wallet,
  Copy,
  Check,
  QrCode,
  Link2,
} from "lucide-react";

import { QRCodeCanvas } from "qrcode.react";

import { toast } from "sonner";

import { supabase } from "@/lib/supabase/client";

import { paymentSchema } from "@/validations/payment";

import GlassCard from "@/components/ui/glass-card";

import PageContainer from "@/components/ui/page-container";

import WalletButton from "@/components/wallet/connect-button";

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

  const [copied, setCopied] =
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
        parsed.error.issues[0].message
      );

      return;
    }

    try {
      setLoading(true);

      // FIXED 2 HOUR EXPIRY
      const expiresAt = new Date(
        Date.now() +
          2 * 60 * 60 * 1000
      ).toISOString();

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
              expiresAt,
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

  const copyLink = async () => {
    if (!link) return;

    await navigator.clipboard.writeText(
      link
    );

    setCopied(true);

    toast.success(
      "Link copied"
    );

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* HERO */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-1.5 text-sm text-fuchsia-300">
            <div className="h-2 w-2 rounded-full bg-fuchsia-400" />

            Powered by Arc
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Create a
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              {" "}
              USDC payment request
            </span>
          </h1>

          <p className="text-white/60 text-lg max-w-2xl">
            Generate secure and
            shareable payment links
            instantly on Arc.
          </p>
        </div>

        {/* WALLET REQUIRED */}
        {!isConnected && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="mb-3 text-sm text-white/70">
              Connect your wallet to
              create a payment request
            </p>

            <WalletButton />
          </div>
        )}

        {/* FORM */}
        <GlassCard>
          <div className="space-y-6">
            {/* HEADER */}
            <div>
              <h2 className="text-2xl font-semibold">
                Payment Details
              </h2>

              <p className="mt-1 text-sm text-white/50">
                Fill in the payment
                information below.
              </p>
            </div>

            {/* RECIPIENT */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">
                Recipient Wallet
              </label>

              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />

                <input
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) =>
                    setRecipient(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 py-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-fuchsia-500/50 focus:bg-white/[0.06]"
                />
              </div>
            </div>

            {/* AMOUNT */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">
                Amount (USDC)
              </label>

              <input
                placeholder="100"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-fuchsia-500/50 focus:bg-white/[0.06]"
              />
            </div>

            {/* MEMO */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">
                Memo (Optional)
              </label>

              <textarea
                placeholder="Payment for..."
                value={memo}
                onChange={(e) =>
                  setMemo(
                    e.target.value
                  )
                }
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white placeholder:text-white/30 outline-none resize-none transition focus:border-fuchsia-500/50 focus:bg-white/[0.06]"
              />
            </div>

            {/* EXPIRY */}
            <div className="space-y-2">
              <label className="text-sm text-white/70">
                Expiry
              </label>

              <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Auto Expires
                    </p>

                    <p className="text-xs text-white/50 mt-1">
                      Payment requests
                      automatically expire
                      after 2 hours
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/30 px-3 py-2 text-sm font-semibold text-fuchsia-300">
                    2H
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTON */}
            <button
              onClick={
                createRequest
              }
              disabled={
                !isConnected ||
                loading
              }
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-5 py-4 font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Payment Request"}
            </button>
          </div>
        </GlassCard>

        {/* RESULT */}
        {link && (
          <GlassCard>
            <div className="space-y-6">
              {/* HEADER */}
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-fuchsia-500/10 p-3">
                  <Link2 className="h-5 w-5 text-fuchsia-300" />
                </div>

                <div>
                  <h3 className="text-xl font-semibold">
                    Payment Link Ready
                  </h3>

                  <p className="text-sm text-white/50">
                    Share this link or
                    QR code with anyone.
                  </p>
                </div>
              </div>

              {/* LINK */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="break-all text-sm text-white/80">
                  {link}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={copyLink}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
                >
                  <div className="flex items-center justify-center gap-2">
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </div>
                </button>

                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-4 py-3 text-center font-medium transition hover:opacity-90"
                >
                  Open Payment Page
                </a>
              </div>

              {/* QR */}
              <div className="rounded-3xl border border-white/10 bg-white p-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-black">
                  <QrCode className="h-5 w-5" />

                  <span className="font-medium">
                    Scan QR Code
                  </span>
                </div>

                <QRCodeCanvas
                  value={link}
                  size={220}
                />

                <p className="text-xs text-gray-500 text-center">
                  Scan or share to
                  receive payment
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </PageContainer>
  );
}