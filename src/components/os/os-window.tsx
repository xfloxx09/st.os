"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Panel } from "@/stores/app-store";
import { useAppStore } from "@/stores/app-store";

interface OsWindowProps {
  groupId: string;
  host: Panel;
  tabs: Panel[];
  activeTabId: string;
  children: ReactNode;
}

function findMergeZoneAt(x: number, y: number): string | null {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const zone = (el as HTMLElement).dataset?.mergeZone;
    if (zone) return zone;
  }
  return null;
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
  const draggingGroupId = useAppStore((s) => s.draggingGroupId);
  const mergeHoverGroupId = useAppStore((s) => s.mergeHoverGroupId);
  const setDraggingGroupId = useAppStore((s) => s.setDraggingGroupId);
  const setMergeHoverGroupId = useAppStore((s) => s.setMergeHoverGroupId);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);

  const { x, y, width, height, zIndex, minimized, maximized, title } = host;
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const isMergeTarget =
    mergeHoverGroupId === groupId &&
    draggingGroupId !== null &&
    draggingGroupId !== groupId;
  const anotherWindowDragging =
    draggingGroupId !== null && draggingGroupId !== groupId;

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
    setDraggingGroupId(groupId);
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

    const hoverZone = findMergeZoneAt(e.clientX, e.clientY);
    if (hoverZone && hoverZone !== groupId) {
      setMergeHoverGroupId(hoverZone);
    } else {
      setMergeHoverGroupId(null);
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragging && activeTab) {
      const targetGroup = findMergeZoneAt(e.clientX, e.clientY);
      if (targetGroup && targetGroup !== groupId) {
        mergePanels(activeTab.id, targetGroup);
      }
    }
    dragRef.current = null;
    resizeRef.current = null;
    setDragging(false);
    setResizing(false);
    setDraggingGroupId(null);
    setMergeHoverGroupId(null);
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
      className="absolute flex flex-col border border-[var(--border)] bg-[var(--bg-panel)] shadow-none"
      style={{ ...layoutStyle, zIndex }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      onMouseDown={() => focusGroup(groupId)}
    >
      <div
        className={`flex h-7 cursor-grab items-center justify-between border-b px-2 text-[10px] ${
          dragging ? "cursor-grabbing" : ""
        } ${
          tabs.length === 1 && isMergeTarget
            ? "border-[var(--accent)] bg-[var(--accent)]/15"
            : "border-[var(--border)]"
        }`}
        data-merge-zone={tabs.length === 1 ? groupId : undefined}
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
        <motion.div
          className={`relative flex gap-0 border-b overflow-x-auto transition-colors ${
            isMergeTarget
              ? "border-[var(--accent)] bg-[var(--accent)]/15"
              : "border-[var(--border)]"
          }`}
          data-merge-zone={groupId}
          animate={
            isMergeTarget
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(0,255,204,0)",
                    "0 0 12px 2px rgba(0,255,204,0.45)",
                    "0 0 0 0 rgba(0,255,204,0)",
                  ],
                }
              : { boxShadow: "0 0 0 0 rgba(0,255,204,0)" }
          }
          transition={
            isMergeTarget
              ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.15 }
          }
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex shrink-0 items-center border-r border-[var(--border)]/50 ${
                tab.id === activeTabId ? "bg-[var(--bg)]" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(groupId, tab.id)}
                className={`max-w-[140px] truncate px-2 py-1 text-[10px] ${
                  tab.id === activeTabId
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.title}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closePanel(tab.id);
                }}
                className="px-1.5 py-1 text-[9px] leading-none text-[var(--text-secondary)] hover:bg-[var(--danger)]/20 hover:text-[var(--danger)]"
                aria-label={`Close ${tab.title}`}
                title="Close tab"
              >
                ×
              </button>
            </div>
          ))}
          <AnimatePresence>
            {isMergeTarget ? (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="ml-auto shrink-0 px-2 py-1 text-[9px] tracking-widest text-[var(--accent)]"
              >
                DROP TO MERGE
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}

      {tabs.length === 1 && isMergeTarget ? (
        <motion.div
          className="border-b border-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 text-center text-[9px] tracking-widest text-[var(--accent)]"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0 }}
        >
          DROP ON TITLE BAR TO MERGE
        </motion.div>
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
          Drop on another window&apos;s tab bar to merge
        </p>
      ) : null}

      {anotherWindowDragging && !isMergeTarget && tabs.length > 1 ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-7 h-6 border-b border-dashed border-[var(--border)]/40"
          aria-hidden
        />
      ) : null}
    </motion.div>
  );
}
