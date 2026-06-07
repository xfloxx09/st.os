import type { NetworkGraphEdge, NetworkGraphNode } from "@/lib/analyze/types";

export interface LayoutNode extends NetworkGraphNode {
  x: number;
  y: number;
  r: number;
}

const W = 640;
const H = 420;
const CX = W / 2;
const CY = H / 2 + 10;

export function layoutNetworkGraph(
  nodes: NetworkGraphNode[],
  _edges: NetworkGraphEdge[]
): LayoutNode[] {
  const seed = nodes.find((n) => n.isSeed);
  const wallets = nodes.filter((n) => n.type === "wallet" && !n.isSeed);
  const tokens = nodes.filter((n) => n.type === "token");
  const funding = nodes.filter((n) => n.type === "funding");

  const laid: LayoutNode[] = [];

  if (seed) {
    laid.push({ ...seed, x: CX, y: CY, r: 28 });
  }

  wallets.forEach((node, i) => {
    const angle = (i / Math.max(wallets.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = 110 + (i % 2) * 18;
    laid.push({
      ...node,
      x: CX + Math.cos(angle) * radius,
      y: CY + Math.sin(angle) * radius,
      r: node.tier === "INNER_CIRCLE" ? 20 : 16,
    });
  });

  tokens.forEach((node, i) => {
    const angle = (i / Math.max(tokens.length, 1)) * Math.PI * 2;
    laid.push({
      ...node,
      x: CX + Math.cos(angle) * 175,
      y: CY + Math.sin(angle) * 175,
      r: 12,
    });
  });

  funding.forEach((node, i) => {
    laid.push({
      ...node,
      x: CX - 80 + i * 40,
      y: CY - 150,
      r: 14,
    });
  });

  return laid;
}

export const GRAPH_VIEWBOX = { w: W, h: H };
