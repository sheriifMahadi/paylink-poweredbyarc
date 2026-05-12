import { z } from "zod";

export const paymentSchema =
  z.object({
    recipient_wallet:
      z
        .string()
        .regex(
          /^0x[a-fA-F0-9]{40}$/,
          "Invalid wallet address"
        ),

    amount:
      z
        .number()
        .positive(
          "Amount must be positive"
        ),

    memo:
      z
        .string()
        .max(
          120,
          "Memo too long"
        )
        .optional(),
  });