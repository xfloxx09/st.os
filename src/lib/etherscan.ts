import { etherscanQueue } from "@/lib/api-queue";

const BASE_URL = "https://api.etherscan.io/v2/api";
const CHAIN_ID = "1";

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

async function etherscanFetch<T>(
  params: Record<string, string>
): Promise<T> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = new URL(BASE_URL);
  url.searchParams.set("chainid", CHAIN_ID);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (apiKey) url.searchParams.set("apikey", apiKey);

  return etherscanQueue.add(async () => {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
    const json = (await res.json()) as EtherscanResponse<T>;
    if (json.status !== "1" && json.message !== "OK") {
      throw new Error(json.result ? String(json.result) : json.message);
    }
    return json.result;
  }) as Promise<T>;
}

export interface EtherscanTokenInfo {
  contractAddress: string;
  tokenName: string;
  symbol: string;
  divisor: string;
  tokenType: string;
  totalSupply: string;
  blueCheckmark: string;
  description: string;
  website: string;
  email: string;
  blog: string;
  reddit: string;
  slack: string;
  facebook: string;
  twitter: string;
  bitcointalk: string;
  github: string;
  telegram: string;
  wechat: string;
  linkedin: string;
  discord: string;
  whitepaper: string;
  tokenPriceUSD: string;
}

export interface EtherscanHolder {
  TokenHolderAddress: string;
  TokenHolderQuantity: string;
}

export interface ContractCreation {
  contractAddress: string;
  contractCreator: string;
  txHash: string;
}

export interface ContractSource {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export async function fetchTokenInfo(
  contractAddress: string
): Promise<EtherscanTokenInfo | null> {
  const result = await etherscanFetch<EtherscanTokenInfo[]>({
    module: "token",
    action: "tokeninfo",
    contractaddress: contractAddress,
  });
  return result[0] ?? null;
}

export async function fetchTokenHolders(
  contractAddress: string,
  page = 1,
  offset = 100
): Promise<EtherscanHolder[]> {
  return etherscanFetch<EtherscanHolder[]>({
    module: "token",
    action: "tokenholderlist",
    contractaddress: contractAddress,
    page: String(page),
    offset: String(offset),
  });
}

export async function fetchAllTokenHolders(
  contractAddress: string,
  maxHolders = 2500,
  pageSize = 100
): Promise<EtherscanHolder[]> {
  const all: EtherscanHolder[] = [];
  let page = 1;

  while (all.length < maxHolders) {
    const batch = await fetchTokenHolders(contractAddress, page, pageSize);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < pageSize) break;
    page += 1;
  }

  return all.slice(0, maxHolders);
}

export async function fetchContractCreation(
  contractAddress: string
): Promise<ContractCreation | null> {
  const result = await etherscanFetch<ContractCreation[]>({
    module: "contract",
    action: "getcontractcreation",
    contractaddresses: contractAddress,
  });
  return result[0] ?? null;
}

export async function fetchContractSource(
  contractAddress: string
): Promise<ContractSource | null> {
  const result = await etherscanFetch<ContractSource[]>({
    module: "contract",
    action: "getsourcecode",
    address: contractAddress,
  });
  return result[0] ?? null;
}

export async function fetchGasPrice(): Promise<{
  gwei: number;
  baseFeeGwei: number | null;
}> {
  try {
    const result = await etherscanFetch<{
      ProposeGasPrice: string;
      suggestBaseFee?: string;
    }>({
      module: "gastracker",
      action: "gasoracle",
    });
    return {
      gwei: Number(result.ProposeGasPrice) || 0,
      baseFeeGwei: result.suggestBaseFee
        ? Number(result.suggestBaseFee)
        : null,
    };
  } catch {
    return { gwei: 0, baseFeeGwei: null };
  }
}
