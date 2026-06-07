import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "ca.os",
    timestamp: new Date().toISOString(),
  });
}
