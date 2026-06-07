import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { getPricingSettings, updatePricingSettings } from "@/lib/billing/settings";
import { isAdmin } from "@/lib/billing/subscription";
import type { PricingSettings } from "@/lib/billing/types";

export async function GET() {
  const session = await getAuthSession();
  if (!session || session.type !== "user" || !(await isAdmin(session.userId))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  return NextResponse.json(await getPricingSettings());
}

export async function PUT(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || session.type !== "user" || !(await isAdmin(session.userId))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as PricingSettings;
    await updatePricingSettings(body, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 400 }
    );
  }
}
