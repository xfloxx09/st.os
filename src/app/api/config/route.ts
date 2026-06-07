import { NextResponse } from "next/server";
import { getPublicAppUrl, getTelegramBotUsername } from "@/lib/config/public";

export async function GET() {
  return NextResponse.json({
    telegramBotUsername: getTelegramBotUsername(),
    appUrl: getPublicAppUrl(),
  });
}
