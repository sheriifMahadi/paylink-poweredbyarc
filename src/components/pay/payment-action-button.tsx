"use client";

import { Loader2 } from "lucide-react";

interface PaymentActionButtonProps {
  isConnected: boolean;
  paying: boolean;
  paymentLocked: boolean;
  insufficientBalance: boolean;
  requestStatus: string;
  onClick: () => void;
}

export default function PaymentActionButton({
  onClick,
  disabled,
  className = "w-full rounded-3xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-6 py-5 text-lg font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
  children
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}