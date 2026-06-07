import { NextResponse } from "next/server";
import { fetchGasPrice } from "@/lib/etherscan";

export async function GET() {
  const gas = await fetchGasPrice();
  return NextResponse.json({
    gwei: gas.gwei,
    baseFeeGwei: gas.baseFeeGwei,
    timestamp: new Date().toISOString(),
  });
}
