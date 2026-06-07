"use client";

import { useRef, useState, type PointerEvent } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/app-store";

interface OsWindowProps {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  children: React.ReactNode;
}

export function OsWindow({
  id,
  title,
  x,
  y,
  width,
  height,
  zIndex,
  minimized,
  children,
}: OsWindowProps) {
  const closePanel = useAppStore((s) => s.closePanel);
  const minimizePanel = useAppStore((s) => s.minimizePanel);
  const restorePanel = useAppStore((s) => s.restorePanel);
  const focusPanel = useAppStore((s) => s.focusPanel);
  const movePanel = useAppStore((s) => s.movePanel);

  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    focusPanel(id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: x,
      originY: y,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    movePanel(id, dragRef.current.originX + dx, dragRef.current.originY + dy);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => restorePanel(id)}
        className="fixed bottom-10 left-4 z-20 border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-1 text-[10px] text-[var(--text-primary)] hover:border-[var(--accent)]"
        style={{ marginLeft: zIndex * 8 }}
      >
        {title}
      </button>
    );
  }

  return (
    <motion.div
      className="absolute flex flex-col border border-[var(--border)] bg-[var(--bg-panel)] shadow-none"
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex,
      }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={() => focusPanel(id)}
    >
      <div
        className={`flex h-7 cursor-grab items-center justify-between border-b border-[var(--border)] px-2 text-[10px] ${dragging ? "cursor-grabbing" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="tracking-wider text-[var(--accent)]">{title}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => minimizePanel(id)}
            className="text-[var(--text-secondary)] hover:text-[var(--warning)]"
            aria-label="Minimize"
          >
            _
          </button>
          <button
            type="button"
            onClick={() => closePanel(id)}
            className="text-[var(--text-secondary)] hover:text-[var(--danger)]"
            aria-label="Close"
          >
            x
          </button>
        </div>
      </div>
      <div className="os-scrollbar flex-1 overflow-auto p-3 text-xs">{children}</div>
    </motion.div>
  );
}
