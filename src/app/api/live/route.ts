import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "exposed.os",
    timestamp: new Date().toISOString(),
  });
}
