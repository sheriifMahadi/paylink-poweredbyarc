"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResolvePage() {
  const [value, setValue] = useState("");

  const router = useRouter();

  const resolvePayment = () => {
    if (!value) return;

    // FULL URL
    if (value.includes("/pay/")) {
      const split = value.split("/pay/");
      const id = split[1];

      router.push(`/pay/${id}`);

      return;
    }

    // RAW ID
    router.push(`/pay/${value}`);
  };

  return (
    <div className="max-w-xl w-full mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Resolve Payment
      </h1>

      <input
        placeholder="Paste payment link or ID"
        value={value}
        onChange={(e) =>
          setValue(e.target.value)
        }
        className="w-full border p-2 rounded"
      />

      <button
        onClick={resolvePayment}
        className="bg-black text-white px-4 py-2 rounded w-full"
      >
        Open Payment
      </button>
    </div>
  );
}