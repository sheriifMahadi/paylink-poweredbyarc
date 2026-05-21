"use client";

import { 
  Clock3, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle 
} from "lucide-react";

type PaymentStatus = 
  | "pending" 
  | "processing" 
  | "paid" 
  | "expired" 
  | "cancelled";

const statusMap = {
  pending: {
    icon: Clock3,
    className: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    label: "PENDING"
  },
  processing: {
    icon: Loader2,
    className: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    label: "PROCESSING"
  },
  paid: {
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-300 border-green-500/20",
    label: "PAID"
  },
  expired: {
    icon: AlertTriangle,
    className: "bg-red-500/10 text-red-300 border-red-500/20",
    label: "EXPIRED"
  },
  cancelled: {
    icon: XCircle,
    className: "bg-gray-500/10 text-gray-300 border-gray-500/20",
    label: "CANCELLED"
  }
};

interface PaymentStatusIndicatorProps {
  status: PaymentStatus;
}

export default function PaymentStatusIndicator({ 
  status 
}: PaymentStatusIndicatorProps) {
  const { icon: StatusIcon, className, label } = 
    statusMap[status];

  return (
    <div 
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${className}`}
    >
      <StatusIcon 
        className={`h-4 w-4 ${
          status === "processing" ? "animate-spin" : ""
        }`} 
      />
      {label}
    </div>
  );
}