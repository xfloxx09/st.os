"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/stores/app-store";

const LINES = [
  "CA.OS v1.0 — INITIALIZING...",
  "LOADING KERNEL MODULES...",
  "CONNECTING TO ETH MAINNET...",
  "VERIFYING AUTH CHANNELS...",
  "MOUNTING FORENSICS ENGINE...",
  "SYSTEM READY.",
];

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const setBootComplete = useAppStore((s) => s.setBootComplete);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < LINES.length) {
        setVisibleLines((prev) => [...prev, LINES[index]]);
        index += 1;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          setBootComplete(true);
          onComplete();
        }, 500);
      }
    }, 420);

    return () => clearInterval(interval);
  }, [onComplete, setBootComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] p-8"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-full max-w-2xl border border-[var(--border)] bg-[var(--bg-panel)] p-6">
            <div className="mb-4 text-xs tracking-[0.3em] text-[var(--accent)]">
              BOOT SEQUENCE
            </div>
            <div className="space-y-2 text-sm">
              {visibleLines.map((line, i) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={
                    i === visibleLines.length - 1 && line !== "SYSTEM READY."
                      ? "cursor-blink text-[var(--text-primary)]"
                      : line === "SYSTEM READY."
                        ? "text-[var(--success)]"
                        : "text-[var(--text-secondary)]"
                  }
                >
                  {">"} {line}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
