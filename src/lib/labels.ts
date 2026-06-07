import labelsData from "../../data/known-labels.json";
import { normalizeAddress } from "@/lib/ethereum";

type LabelCategory = "cex" | "bridges" | "mixers" | "dex" | "burn";

interface KnownLabels {
  cex: Record<string, string>;
  bridges: Record<string, string>;
  mixers: Record<string, string>;
  dex: Record<string, string>;
  burn: string[];
}

const labels = labelsData as KnownLabels;

const ADDRESS_INDEX = new Map<string, { label: string; category: LabelCategory }>();

function buildIndex() {
  if (ADDRESS_INDEX.size > 0) return;

  for (const [address, label] of Object.entries(labels.cex)) {
    ADDRESS_INDEX.set(normalizeAddress(address), { label, category: "cex" });
  }
  for (const [address, label] of Object.entries(labels.bridges)) {
    ADDRESS_INDEX.set(normalizeAddress(address), { label, category: "bridges" });
  }
  for (const [address, label] of Object.entries(labels.mixers)) {
    ADDRESS_INDEX.set(normalizeAddress(address), { label, category: "mixers" });
  }
  for (const [address, label] of Object.entries(labels.dex)) {
    ADDRESS_INDEX.set(normalizeAddress(address), { label, category: "dex" });
  }
  for (const address of labels.burn) {
    ADDRESS_INDEX.set(normalizeAddress(address), { label: "Burn Address", category: "burn" });
  }
}

export function getAddressLabel(address: string): string | null {
  buildIndex();
  return ADDRESS_INDEX.get(normalizeAddress(address))?.label ?? null;
}

export function getAddressCategory(address: string): LabelCategory | null {
  buildIndex();
  return ADDRESS_INDEX.get(normalizeAddress(address))?.category ?? null;
}

export function shouldExcludeHolder(
  address: string,
  contractAddress: string
): boolean {
  const normalized = normalizeAddress(address);
  const contract = normalizeAddress(contractAddress);

  if (normalized === contract) return true;

  buildIndex();
  const entry = ADDRESS_INDEX.get(normalized);
  if (!entry) return false;

  return (
    entry.category === "cex" ||
    entry.category === "dex" ||
    entry.category === "bridges" ||
    entry.category === "burn"
  );
}

export function isExcludedFromStalk(address: string): boolean {
  buildIndex();
  const entry = ADDRESS_INDEX.get(normalizeAddress(address));
  if (!entry) return false;
  return entry.category === "cex" || entry.category === "dex" || entry.category === "burn";
}
