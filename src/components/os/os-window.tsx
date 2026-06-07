"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { Panel } from "@/stores/app-store";
import { useAppStore } from "@/stores/app-store";

interface OsWindowProps {
  groupId: string;
  host: Panel;
  tabs: Panel[];
  activeTabId: string;
  children: ReactNode;
}

export function OsWindow({
  groupId,
  host,
  tabs,
  activeTabId,
  children,
}: OsWindowProps) {
  const closeGroup = useAppStore((s) => s.closeGroup);
  const minimizeGroup = useAppStore((s) => s.minimizeGroup);
  const restoreGroup = useAppStore((s) => s.restoreGroup);
  const toggleMaximizeGroup = useAppStore((s) => s.toggleMaximizeGroup);
  const focusGroup = useAppStore((s) => s.focusGroup);
  const moveGroup = useAppStore((s) => s.moveGroup);
  const resizeGroup = useAppStore((s) => s.resizeGroup);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const mergePanels = useAppStore((s) => s.mergePanels);
  const detachPanel = useAppStore((s) => s.detachPanel);
  const closePanel = useAppStore((s) => s.closePanel);
  const panels = useAppStore((s) => s.panels);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(false);
  const [resizing, setResizing] = useState(false);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);

  const { x, y, width, height, zIndex, minimized, maximized, title } = host;
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    focusGroup(groupId);
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
    if (resizeRef.current) {
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;
      resizeGroup(
        groupId,
        Math.max(320, resizeRef.current.originW + dx),
        Math.max(240, resizeRef.current.originH + dy)
      );
      return;
    }
    if (!dragRef.current || maximized) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    moveGroup(groupId, dragRef.current.originX + dx, dragRef.current.originY + dy);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragging) {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      for (const el of elements) {
        const targetGroup = (el as HTMLElement).dataset?.windowGroup;
        if (targetGroup && targetGroup !== groupId && activeTab) {
          mergePanels(activeTab.id, targetGroup);
          break;
        }
      }
    }
    dragRef.current = null;
    resizeRef.current = null;
    setDragging(false);
    setResizing(false);
    setMergeTarget(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onResizeDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    focusGroup(groupId);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originW: width,
      originH: height,
    };
    setResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => restoreGroup(groupId)}
        className="fixed bottom-10 left-4 z-20 border border-[var(--border)] bg-[var(--bg-panel)] px-3 py-1 text-[10px] text-[var(--text-primary)] hover:border-[var(--accent)]"
        style={{ marginLeft: zIndex * 8 }}
      >
        {tabs.length > 1 ? `[${tabs.length}] ` : ""}
        {activeTab?.title ?? title}
      </button>
    );
  }

  const layoutStyle = maximized
    ? { left: 8, top: 72, width: "calc(100% - 16px)", height: "calc(100% - 96px)" }
    : { left: x, top: y, width, height };

  return (
    <motion.div
      className={`absolute flex flex-col border bg-[var(--bg-panel)] shadow-none ${
        mergeTarget ? "border-[var(--accent)]" : "border-[var(--border)]"
      }`}
      style={{ ...layoutStyle, zIndex }}
      data-window-group={groupId}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={() => focusGroup(groupId)}
      onMouseEnter={() => setMergeTarget(dragging)}
    >
      <div
        className={`flex h-7 cursor-grab items-center justify-between border-b border-[var(--border)] px-2 text-[10px] ${
          dragging ? "cursor-grabbing" : ""
        }`}
        data-window-group={groupId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="truncate tracking-wider text-[var(--accent)]">
          {tabs.length === 1 ? title : activeTab?.title}
        </span>
        <div className="flex items-center gap-2">
          {tabs.length > 1 ? (
            <button
              type="button"
              onClick={() => activeTab && detachPanel(activeTab.id)}
              className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
              title="Detach tab"
            >
              ⧉
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => minimizeGroup(groupId)}
            className="text-[var(--text-secondary)] hover:text-[var(--warning)]"
            aria-label="Minimize"
          >
            _
          </button>
          <button
            type="button"
            onClick={() => toggleMaximizeGroup(groupId)}
            className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
            aria-label="Maximize"
          >
            {maximized ? "❐" : "□"}
          </button>
          <button
            type="button"
            onClick={() =>
              tabs.length > 1 && activeTab
                ? closePanel(activeTab.id)
                : closeGroup(groupId)
            }
            className="text-[var(--text-secondary)] hover:text-[var(--danger)]"
            aria-label="Close"
          >
            x
          </button>
        </div>
      </div>

      {tabs.length > 1 ? (
        <div className="flex gap-0 border-b border-[var(--border)] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(groupId, tab.id)}
              className={`shrink-0 px-3 py-1 text-[10px] ${
                tab.id === activeTabId
                  ? "bg-[var(--bg)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg)]"
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="os-scrollbar relative flex-1 overflow-auto p-3 text-xs">
        {children}
      </div>

      {!maximized ? (
        <div
          className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize"
          onPointerDown={onResizeDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ) : null}

      {dragging && panels.length > 1 ? (
        <p className="pointer-events-none absolute -bottom-5 left-0 text-[9px] text-[var(--text-secondary)]">
          Drop on another window to merge tabs
        </p>
      ) : null}
    </motion.div>
  );
}
