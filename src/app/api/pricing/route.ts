import { NextResponse } from "next/server";
import { getPublicPricing } from "@/lib/billing/quotes";

export async function GET() {
  const pricing = await getPublicPricing();
  return NextResponse.json(pricing);
}
