import { NextResponse } from "next/server";

import { bridgeClient } from "@/lib/bridge/client";

import { bridgeChains } from "@/lib/bridge/chains";

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const {
      fromChain,
      amount,
      wallet,
    } = body;

    if (
      !fromChain ||
      !amount ||
      !wallet
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing params",
        },
        {
          status: 400,
        }
      );
    }

    const source =
      bridgeChains[
        fromChain as keyof typeof bridgeChains
      ];

    const destination =
      bridgeChains.arc;

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported source chain",
        },
        {
          status: 400,
        }
      );
    }

    const route =
      await bridgeClient.getRoutes({
        fromChainId:
          source.chainId,

        toChainId:
          destination.chainId,

        token: "USDC",

        amount: (
          Number(amount) *
          1_000_000
        ).toString(),
      });

    return NextResponse.json({
      success: true,
      route,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Bridge failed",
      },
      {
        status: 500,
      }
    );
  }
}