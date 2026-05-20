import { NextResponse } from "next/server";

export async function POST(req: Request) {
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
          error: "Missing params",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,

      bridge: {
        fromChain,
        amount,
        wallet,
      },
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: "Bridge failed",
      },
      {
        status: 500,
      }
    );
  }
}