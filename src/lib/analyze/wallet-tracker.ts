import {
  analyzeWallet,
  analyzeWalletOverview,
} from "@/lib/analyze/wallet-analyzer";
import type { WalletTrackSnapshot } from "@/lib/analyze/types";
import {
  computeWalletRating,
  extractConnectedWallets,
} from "@/lib/analyze/wallet-rating";
import { fetchEthBalance } from "@/lib/alchemy";
import { getAddressLabel } from "@/lib/labels";
import { normalizeAddress } from "@/lib/ethereum";

export async function buildWalletTrackSnapshot(
  walletAddress: string,
  contractAddress: string | null,
  percentOfSupply: number | null = null,
  label?: string | null
): Promise<WalletTrackSnapshot> {
  const wallet = normalizeAddress(walletAddress);

  const profile = contractAddress
    ? await analyzeWallet(
        wallet,
        normalizeAddress(contractAddress),
        percentOfSupply
      )
    : await analyzeWalletOverview(wallet);
  const rating = computeWalletRating(profile);
  const connected = extractConnectedWallets(profile).map((c) => ({
    ...c,
    label: getAddressLabel(c.address),
  }));

  const ethBalance = await fetchEthBalance(wallet).catch(() => null);

  return {
    ...profile,
    contractAddress: contractAddress
      ? normalizeAddress(contractAddress)
      : profile.contractAddress,
    rating,
    connectedWallets: connected,
    ethBalance,
    trackLabel: label ?? null,
    tracking: true,
  };
}
