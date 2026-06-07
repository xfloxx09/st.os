"use client";

import { useEffect } from "react";
import { fetchTrackRefresh } from "@/lib/terminal/phase-actions";
import { useAppStore, walletTrackKey } from "@/stores/app-store";

const REFRESH_MS = 90_000;

export function useTrackAutoRefresh() {
  const panels = useAppStore((s) => s.panels);
  const user = useAppStore((s) => s.user);
  const setWalletTrack = useAppStore((s) => s.setWalletTrack);

  useEffect(() => {
    if (!user) return;

    const openTracks = panels.filter(
      (p) => p.type === "WALLET_TRACK" && !p.minimized && p.walletAddress
    );
    if (openTracks.length === 0) return;

    const refreshOpen = async () => {
      for (const panel of openTracks) {
        if (!panel.walletAddress) continue;
        try {
          const snapshot = await fetchTrackRefresh(
            panel.walletAddress,
            panel.contractAddress ?? null
          );
          setWalletTrack(walletTrackKey(panel.walletAddress), snapshot);
        } catch {
          // silent background refresh
        }
      }
    };

    const timer = setInterval(() => {
      void refreshOpen();
    }, REFRESH_MS);

    return () => clearInterval(timer);
  }, [panels, setWalletTrack, user]);
}
