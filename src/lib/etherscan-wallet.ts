import { etherscanQueue } from "@/lib/api-queue";

const BASE_URL = "https://api.etherscan.io/v2/api";
const CHAIN_ID = "1";

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

async function etherscanFetch<T>(params: Record<string, string>): Promise<T> {
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
      throw new Error(
        typeof json.result === "string" ? json.result : json.message
      );
    }
    return json.result;
  }) as Promise<T>;
}

export interface EthTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  isError: string;
}

export interface TokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

export async function fetchEthTransactions(
  walletAddress: string,
  page = 1,
  offset = 50
): Promise<EthTx[]> {
  return etherscanFetch<EthTx[]>({
    module: "account",
    action: "txlist",
    address: walletAddress,
    startblock: "0",
    endblock: "99999999",
    page: String(page),
    offset: String(offset),
    sort: "asc",
  });
}

export async function fetchTokenTransactions(
  walletAddress: string,
  contractAddress: string,
  page = 1,
  offset = 100
): Promise<TokenTx[]> {
  return etherscanFetch<TokenTx[]>({
    module: "account",
    action: "tokentx",
    address: walletAddress,
    contractaddress: contractAddress,
    page: String(page),
    offset: String(offset),
    sort: "asc",
  });
}

export async function fetchAllTokenTransactions(
  walletAddress: string,
  page = 1,
  offset = 200
): Promise<TokenTx[]> {
  return etherscanFetch<TokenTx[]>({
    module: "account",
    action: "tokentx",
    address: walletAddress,
    page: String(page),
    offset: String(offset),
    sort: "desc",
  });
}
