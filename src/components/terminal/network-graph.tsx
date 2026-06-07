"use client";

import type { NetworkGraphEdge, NetworkGraphNode } from "@/lib/analyze/types";
import {
  GRAPH_VIEWBOX,
  layoutNetworkGraph,
  type LayoutNode,
} from "@/lib/graph/network-layout";

const EDGE_COLOR: Record<NetworkGraphEdge["type"], string> = {
  CO_BOUGHT: "var(--accent)",
  FUNDED_BY: "var(--danger)",
  TRANSFERRED: "var(--warning)",
  SHARED_TOKEN: "var(--success)",
};

const NODE_FILL: Record<NetworkGraphNode["type"], string> = {
  wallet: "var(--bg-panel)",
  token: "var(--bg)",
  funding: "#1a1510",
};

function nodeStroke(node: LayoutNode): string {
  if (node.isSeed) return "var(--warning)";
  if (node.tier === "INNER_CIRCLE") return "var(--danger)";
  if (node.type === "token") return "var(--success)";
  if (node.type === "funding") return "var(--danger)";
  return "var(--accent)";
}

export function NetworkGraph({
  nodes,
  edges,
}: {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}) {
  const laid = layoutNetworkGraph(nodes, edges);
  const byId = new Map(laid.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`0 0 ${GRAPH_VIEWBOX.w} ${GRAPH_VIEWBOX.h}`}
      className="w-full border border-[var(--border)] bg-[var(--bg)]"
      role="img"
      aria-label="Wallet relationship graph"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-secondary)" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const fx = from.x + (dx / len) * from.r;
        const fy = from.y + (dy / len) * from.r;
        const tx = to.x - (dx / len) * (to.r + 4);
        const ty = to.y - (dy / len) * (to.r + 4);
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2;

        return (
          <g key={edge.id}>
            <line
              x1={fx}
              y1={fy}
              x2={tx}
              y2={ty}
              stroke={EDGE_COLOR[edge.type]}
              strokeWidth={Math.max(1, edge.strength / 3)}
              strokeOpacity={0.65}
              markerEnd="url(#arrow)"
            />
            <text
              x={mx}
              y={my - 4}
              textAnchor="middle"
              className="fill-[var(--text-secondary)] text-[7px]"
            >
              {edge.label}
            </text>
          </g>
        );
      })}

      {laid.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={NODE_FILL[node.type]}
            stroke={nodeStroke(node)}
            strokeWidth={node.isSeed ? 2.5 : 1.5}
          />
          <text
            x={node.x}
            y={node.y + node.r + 11}
            textAnchor="middle"
            className="fill-[var(--text-primary)] text-[8px]"
          >
            {node.label.length > 14 ? `${node.label.slice(0, 12)}…` : node.label}
          </text>
          {node.isSeed ? (
            <text
              x={node.x}
              y={node.y + 3}
              textAnchor="middle"
              className="fill-[var(--warning)] text-[8px] font-bold"
            >
              TARGET
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
