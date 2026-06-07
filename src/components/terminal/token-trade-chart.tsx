"use client";

import type { TokenChartPoint, TradeMarker } from "@/lib/analyze/types";

const W = 640;
const H = 200;
const PAD = { t: 12, r: 12, b: 24, l: 48 };

export function TokenTradeChart({
  points,
  markers,
  selectedWallet,
}: {
  points: TokenChartPoint[];
  markers: TradeMarker[];
  selectedWallet?: string | null;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center border border-[var(--border)] bg-[var(--bg)] text-[10px] text-[var(--text-secondary)]">
        Price chart unavailable — no pool OHLCV data
      </div>
    );
  }

  const minTs = new Date(points[0].timestamp).getTime();
  const maxTs = new Date(points[points.length - 1].timestamp).getTime();
  const prices = points.map((p) => p.priceUsd);
  const minP = Math.min(...prices) * 0.98;
  const maxP = Math.max(...prices) * 1.02;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const xFor = (ts: string) => {
    const t = new Date(ts).getTime();
    const ratio = maxTs === minTs ? 0.5 : (t - minTs) / (maxTs - minTs);
    return PAD.l + ratio * plotW;
  };

  const yFor = (price: number) => {
    const ratio = maxP === minP ? 0.5 : (price - minP) / (maxP - minP);
    return PAD.t + (1 - ratio) * plotH;
  };

  const linePath = points
    .map((p, i) => {
      const cmd = i === 0 ? "M" : "L";
      return `${cmd}${xFor(p.timestamp).toFixed(1)},${yFor(p.priceUsd).toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full border border-[var(--border)] bg-[var(--bg)]"
      role="img"
      aria-label="Token price chart with wallet trades"
    >
      <line
        x1={PAD.l}
        y1={PAD.t + plotH}
        x2={PAD.l + plotW}
        y2={PAD.t + plotH}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5}
        strokeOpacity={0.85}
      />

      {markers.map((m) => {
        const x = xFor(m.timestamp);
        const nearest = points.reduce((best, p) => {
          const d = Math.abs(new Date(p.timestamp).getTime() - new Date(m.timestamp).getTime());
          const bd = Math.abs(
            new Date(best.timestamp).getTime() - new Date(m.timestamp).getTime()
          );
          return d < bd ? p : best;
        });
        const y = yFor(nearest.priceUsd);
        const isBuy = m.type === "BUY";
        return (
          <g key={`${m.txHash}-${m.timestamp}`}>
            <line
              x1={x}
              y1={PAD.t}
              x2={x}
              y2={PAD.t + plotH}
              stroke={isBuy ? "var(--success)" : "var(--danger)"}
              strokeWidth={1}
              strokeOpacity={0.25}
            />
            <circle
              cx={x}
              cy={y}
              r={4}
              fill={isBuy ? "var(--success)" : "var(--danger)"}
              stroke="var(--bg-panel)"
              strokeWidth={1}
            />
          </g>
        );
      })}

      {selectedWallet ? (
        <text
          x={PAD.l}
          y={H - 6}
          className="fill-[var(--text-secondary)] text-[9px]"
        >
          ▲ buy · ▼ sell markers for selected wallet
        </text>
      ) : null}
    </svg>
  );
}
