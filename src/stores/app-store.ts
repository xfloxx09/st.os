import { create } from "zustand";
import type { CaAnalysisResult, WalletProfile } from "@/lib/analyze/types";

export type PanelType =
  | "TOKEN_OVERVIEW"
  | "HOLDER_ROSTER"
  | "WALLET_PROFILE"
  | "CROSS_ANALYSIS"
  | "FUND_TRACER";

export interface Panel {
  id: string;
  type: PanelType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  zIndex: number;
  contractAddress?: string;
  walletAddress?: string;
}

export interface SearchHistoryItem {
  id: number;
  contractAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  searchedAt: string;
}

export interface SessionUser {
  userId: number;
  telegramId: number;
  username?: string;
  firstName?: string;
}

export interface GuestSession {
  guestId: string;
  searchesUsed: number;
  searchesRemaining: number;
  searchesLimit: number;
}

interface AppState {
  bootComplete: boolean;
  user: SessionUser | null;
  guest: GuestSession | null;
  panels: Panel[];
  activeProcesses: number;
  sidebarOpen: boolean;
  searchHistory: SearchHistoryItem[];
  nextZIndex: number;
  currentContract: string | null;
  analysisByContract: Record<string, CaAnalysisResult>;
  walletProfiles: Record<string, WalletProfile>;
  lastQueryMs: number | null;
  analyzeError: string | null;
  telegramBotUsername: string | null;
  isAuthenticated: () => boolean;
  setBootComplete: (value: boolean) => void;
  setUser: (user: SessionUser | null) => void;
  setGuest: (guest: GuestSession | null) => void;
  setSearchHistory: (items: SearchHistoryItem[]) => void;
  setActiveProcesses: (count: number) => void;
  setLastQueryMs: (ms: number | null) => void;
  setAnalyzeError: (error: string | null) => void;
  setTelegramBotUsername: (username: string | null) => void;
  setAnalysis: (contractAddress: string, data: CaAnalysisResult) => void;
  setWalletProfile: (key: string, profile: WalletProfile) => void;
  setCurrentContract: (address: string | null) => void;
  toggleSidebar: () => void;
  addPanel: (panel: Omit<Panel, "zIndex" | "minimized">) => void;
  closePanel: (id: string) => void;
  minimizePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  focusPanel: (id: string) => void;
  movePanel: (id: string, x: number, y: number) => void;
  openAnalysisPanels: (contractAddress: string) => void;
  openWalletPanel: (
    walletAddress: string,
    contractAddress: string,
    rank: number
  ) => void;
}

export function walletProfileKey(wallet: string, contract: string) {
  return `${wallet}|${contract}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  bootComplete: false,
  user: null,
  guest: null,
  panels: [],
  activeProcesses: 0,
  sidebarOpen: true,
  searchHistory: [],
  nextZIndex: 1,
  currentContract: null,
  analysisByContract: {},
  walletProfiles: {},
  lastQueryMs: null,
  analyzeError: null,
  telegramBotUsername: null,
  isAuthenticated: () => Boolean(get().user || get().guest),
  setBootComplete: (value) => set({ bootComplete: value }),
  setUser: (user) => set({ user, guest: user ? null : get().guest }),
  setGuest: (guest) => set({ guest, user: guest ? null : get().user }),
  setSearchHistory: (items) => set({ searchHistory: items }),
  setActiveProcesses: (count) => set({ activeProcesses: count }),
  setLastQueryMs: (ms) => set({ lastQueryMs: ms }),
  setAnalyzeError: (error) => set({ analyzeError: error }),
  setTelegramBotUsername: (username) => set({ telegramBotUsername: username }),
  setAnalysis: (contractAddress, data) =>
    set((s) => ({
      analysisByContract: { ...s.analysisByContract, [contractAddress]: data },
    })),
  setWalletProfile: (key, profile) =>
    set((s) => ({
      walletProfiles: { ...s.walletProfiles, [key]: profile },
    })),
  setCurrentContract: (address) => set({ currentContract: address }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addPanel: (panel) =>
    set((s) => {
      const exists = s.panels.some((p) => p.id === panel.id);
      if (exists) {
        return {
          panels: s.panels.map((p) =>
            p.id === panel.id
              ? { ...p, minimized: false, zIndex: s.nextZIndex }
              : p
          ),
          nextZIndex: s.nextZIndex + 1,
        };
      }
      return {
        panels: [...s.panels, { ...panel, minimized: false, zIndex: s.nextZIndex }],
        nextZIndex: s.nextZIndex + 1,
      };
    }),
  closePanel: (id) => set((s) => ({ panels: s.panels.filter((p) => p.id !== id) })),
  minimizePanel: (id) =>
    set((s) => ({
      panels: s.panels.map((p) => (p.id === id ? { ...p, minimized: true } : p)),
    })),
  restorePanel: (id) =>
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === id ? { ...p, minimized: false, zIndex: s.nextZIndex } : p
      ),
      nextZIndex: s.nextZIndex + 1,
    })),
  focusPanel: (id) =>
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === id ? { ...p, zIndex: s.nextZIndex } : p
      ),
      nextZIndex: s.nextZIndex + 1,
    })),
  movePanel: (id, x, y) =>
    set((s) => ({
      panels: s.panels.map((p) => (p.id === id ? { ...p, x, y } : p)),
    })),
  openAnalysisPanels: (contractAddress) =>
    set((s) => {
      const overviewId = `overview-${contractAddress}`;
      const rosterId = `roster-${contractAddress}`;
      const basePanels = s.panels.filter(
        (p) =>
          p.id !== "welcome" &&
          !p.id.startsWith("overview-") &&
          !p.id.startsWith("roster-")
      );

      return {
        panels: [
          ...basePanels,
          {
            id: overviewId,
            type: "TOKEN_OVERVIEW" as const,
            title: "TOKEN_OVERVIEW.EXE",
            x: 32,
            y: 80,
            width: 480,
            height: 360,
            minimized: false,
            zIndex: s.nextZIndex,
            contractAddress,
          },
          {
            id: rosterId,
            type: "HOLDER_ROSTER" as const,
            title: "HOLDER_ROSTER.EXE",
            x: 540,
            y: 80,
            width: 520,
            height: 420,
            minimized: false,
            zIndex: s.nextZIndex + 1,
            contractAddress,
          },
        ],
        nextZIndex: s.nextZIndex + 2,
        currentContract: contractAddress,
      };
    }),
  openWalletPanel: (walletAddress, contractAddress, rank) =>
    set((s) => {
      const id = `wallet-${walletAddress}-${contractAddress}`;
      const offset = (rank % 5) * 24;
      const panel: Panel = {
        id,
        type: "WALLET_PROFILE",
        title: `WALLET_PROFILE #${rank}`,
        x: 80 + offset,
        y: 120 + offset,
        width: 460,
        height: 480,
        minimized: false,
        zIndex: s.nextZIndex,
        contractAddress,
        walletAddress,
      };
      const exists = s.panels.some((p) => p.id === id);
      if (exists) {
        return {
          panels: s.panels.map((p) =>
            p.id === id ? { ...p, minimized: false, zIndex: s.nextZIndex } : p
          ),
          nextZIndex: s.nextZIndex + 1,
        };
      }
      return { panels: [...s.panels, panel], nextZIndex: s.nextZIndex + 1 };
    }),
}));
