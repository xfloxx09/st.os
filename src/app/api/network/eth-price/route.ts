import { NextResponse } from "next/server";
import { fetchEthPriceUsd } from "@/lib/eth-price";

export async function GET() {
  const ethPriceUsd = await fetchEthPriceUsd();
  return NextResponse.json({
    ethPriceUsd,
    timestamp: new Date().toISOString(),
  });
}
