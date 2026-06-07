import type { WalletAge } from "@/lib/analyze/types";

export function walletAgeLabel(age: WalletAge | null | undefined): string | null {
  if (!age || age.kind === "UNKNOWN") return null;
  if (age.kind === "FRESH") {
    return age.ageDays != null ? `FRESH · ${age.ageDays}d` : "FRESH";
  }
  return age.ageDays != null ? `OLD · ${age.ageDays}d` : "OLD";
}
