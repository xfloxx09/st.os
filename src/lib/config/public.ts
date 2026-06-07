export function getTelegramBotUsername(): string {
  return (
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ??
    process.env.TELEGRAM_BOT_USERNAME ??
    ""
  ).trim();
}

export function getPublicAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "")
  ).trim();
}
