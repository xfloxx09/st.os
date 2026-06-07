"use client";

import type { WalletAge } from "@/lib/analyze/types";
import { truncateAddress } from "@/lib/ethereum";
import { walletAgeLabel } from "@/lib/analyze/wallet-age-display";

export type WalletBadgeKind = "FRESH" | "OLD" | "DEPLOYER" | string;

const BADGE_STYLE: Record<string, string> = {
  FRESH: "border-[var(--warning)]/60 text-[var(--warning)]",
  OLD: "border-[var(--border)] text-[var(--text-secondary)]",
  DEPLOYER: "border-[var(--danger)]/70 text-[var(--danger)]",
};

function WalletBadge({ kind, label }: { kind: WalletBadgeKind; label?: string }) {
  return (
    <span
      className={`border px-1 py-0.5 text-[8px] leading-none ${
        BADGE_STYLE[kind] ?? "border-[var(--border)] text-[var(--text-secondary)]"
      }`}
    >
      {label ?? kind}
    </span>
  );
}

export function walletDisplayName(
  address: string,
  label: string | null,
  aliases: Record<string, string>,
  truncateLen = 6
): string {
  return (
    aliases[address.toLowerCase()] ??
    label ??
    truncateAddress(address, truncateLen)
  );
}

export function WalletAddressLabel({
  address,
  label,
  aliases,
  walletAge,
  isDeployer = false,
  extraBadges = [],
  truncateLen = 6,
  className = "text-[var(--accent)]",
}: {
  address: string;
  label?: string | null;
  aliases?: Record<string, string>;
  walletAge?: WalletAge | null;
  isDeployer?: boolean;
  extraBadges?: string[];
  truncateLen?: number;
  className?: string;
}) {
  const name = walletDisplayName(
    address,
    label ?? null,
    aliases ?? {},
    truncateLen
  );
  const ageLabel = walletAgeLabel(walletAge);

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      <span>{name}</span>
      {isDeployer ? <WalletBadge kind="DEPLOYER" /> : null}
      {walletAge?.kind === "FRESH" ? (
        <WalletBadge kind="FRESH" label={ageLabel ?? "FRESH"} />
      ) : null}
      {walletAge?.kind === "OLD" ? (
        <WalletBadge kind="OLD" label={ageLabel ?? "OLD"} />
      ) : null}
      {extraBadges.map((badge) => (
        <WalletBadge key={badge} kind={badge} />
      ))}
    </span>
  );
}
