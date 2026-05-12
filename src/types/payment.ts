export interface PaymentRequest {
  id: string;

  creator_wallet: string;

  recipient_wallet: string;

  amount: number;

  memo: string | null;

  status: string;

  tx_hash: string | null;

  paid_by: string | null;

  created_at: string;

  paid_at: string | null;

  expires_at: string | null;
}