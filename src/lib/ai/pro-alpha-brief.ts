import OpenAI from "openai";
import type {
  ProAlphaAiBrief,
  ProAlphaScanResult,
  TokenOverview,
} from "@/lib/analyze/types";
import { walletAgeLabel } from "@/lib/analyze/wallet-age-display";
import { truncateAddress } from "@/lib/ethereum";

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function compactScanPayload(
  scan: ProAlphaScanResult,
  overview: TokenOverview
): string {
  const wallets = scan.trackWallets.map((w) => ({
    rank: w.rank,
    address: truncateAddress(w.address, 6),
    strategy: w.strategy,
    intel: w.intelScore,
    track: w.trackScore,
    holdUsd: w.pnlCurrent.positionUsd,
    totalPnlUsd: w.pnlCurrent.totalPnlUsd,
    unrealizedUsd: w.pnlCurrent.unrealizedPnlUsd,
    realizedUsd: w.pnlCurrent.realizedPnlUsd,
    supplyPct: w.percentOfSupply,
    followers30m: w.followers30m,
    minsAfterFirstBuyer: w.minsAfterFirstBuyer,
    isDeployer: w.isDeployer,
    walletAge: walletAgeLabel(w.walletAge),
    trackReasons: w.trackReasons.slice(0, 4),
  }));

  return JSON.stringify(
    {
      token: overview.symbol,
      contract: truncateAddress(scan.contractAddress, 8),
      priceUsd: overview.priceUsd,
      deployer: scan.deployer ? truncateAddress(scan.deployer, 8) : null,
      liquidityUsd: overview.liquidityUsd,
      marketCap: overview.marketCap,
      dataSummary: scan.summary,
      rankedWallets: wallets,
    },
    null,
    0
  );
}

const SYSTEM_PROMPT = `You are a degen on-chain intel analyst for meme tokens on Ethereum.
You receive factual scan data (PnL, holdings, snipe timing, wallet age, deployer flags).
Your job is to add qualitative insight the raw scores may miss: deployer involvement, fresh-wallet sniper rings, copy-trade dynamics, insider risk, and who is actually worth watching.

Rules:
- Ground claims in the provided data; flag uncertainty when data is thin.
- Call out deployer wallets, fresh wallets (<30d), and old established wallets explicitly.
- Be direct, terminal-style, no fluff. Max 4 sentences in narrative.
- Return valid JSON only.`;

export async function generateProAlphaBrief(
  scan: ProAlphaScanResult,
  overview: TokenOverview
): Promise<ProAlphaAiBrief> {
  const client = getOpenAI();
  if (!client) {
    return fallbackBrief(scan);
  }

  const model = process.env.OPENAI_MODEL_PRO_ALPHA ?? "gpt-4o-mini";
  const payload = compactScanPayload(scan, overview);

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: 420,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze this Pro Track scan and return JSON with keys: tokenVerdict (string), watchFirst (string[] max 3), redFlags (string[] max 4), walletNotes (array of {address, note} for top wallets), narrative (string).\n\nDATA:\n${payload}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return fallbackBrief(scan);

  try {
    const parsed = JSON.parse(raw) as Partial<ProAlphaAiBrief>;
    return {
      tokenVerdict: String(parsed.tokenVerdict ?? "No AI verdict available."),
      watchFirst: Array.isArray(parsed.watchFirst)
        ? parsed.watchFirst.map(String).slice(0, 3)
        : [],
      redFlags: Array.isArray(parsed.redFlags)
        ? parsed.redFlags.map(String).slice(0, 4)
        : [],
      walletNotes: Array.isArray(parsed.walletNotes)
        ? parsed.walletNotes
            .filter((n) => n && typeof n === "object")
            .map((n) => ({
              address: String((n as { address?: string }).address ?? ""),
              note: String((n as { note?: string }).note ?? ""),
            }))
            .filter((n) => n.address && n.note)
            .slice(0, 6)
        : [],
      narrative: String(parsed.narrative ?? parsed.tokenVerdict ?? ""),
    };
  } catch {
    return fallbackBrief(scan);
  }
}

function fallbackBrief(scan: ProAlphaScanResult): ProAlphaAiBrief {
  const top = scan.trackWallets[0];
  const fresh = scan.trackWallets.filter((w) => w.walletAge.kind === "FRESH").length;
  const deployers = scan.trackWallets.filter((w) => w.isDeployer).length;

  return {
    tokenVerdict: top
      ? `Top track: ${top.strategy} wallet with score ${top.trackScore}.`
      : "No ranked wallets in scan.",
    watchFirst: scan.trackWallets.slice(0, 2).map((w) => truncateAddress(w.address, 6)),
    redFlags: [
      ...(deployers > 0 ? [`${deployers} deployer wallet(s) in track list`] : []),
      ...(fresh > 0 ? [`${fresh} fresh wallet(s) (<30d on-chain)`] : []),
    ],
    walletNotes: [],
    narrative:
      "AI brief unavailable — configure OPENAI_API_KEY for qualitative analysis.",
  };
}
