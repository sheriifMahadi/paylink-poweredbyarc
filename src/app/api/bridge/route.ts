import { NextResponse } from "next/server";

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

    console.log(
      "Bridge request:",
      {
        fromChain,
        amount,
        wallet,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Bridge route working",
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error:
          "Bridge route failed",
      },
      {
        status: 500,
      }
    );
  }
}