import { create } from "zustand";
import type { CaAnalysisResult } from "@/lib/analyze/types";

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

interface AppState {
  bootComplete: boolean;
  user: SessionUser | null;
  panels: Panel[];
  activeProcesses: number;
  sidebarOpen: boolean;
  searchHistory: SearchHistoryItem[];
  nextZIndex: number;
  currentContract: string | null;
  analysisByContract: Record<string, CaAnalysisResult>;
  lastQueryMs: number | null;
  analyzeError: string | null;
  telegramBotUsername: string | null;
  setBootComplete: (value: boolean) => void;
  setUser: (user: SessionUser | null) => void;
  setSearchHistory: (items: SearchHistoryItem[]) => void;
  setActiveProcesses: (count: number) => void;
  setLastQueryMs: (ms: number | null) => void;
  setAnalyzeError: (error: string | null) => void;
  setTelegramBotUsername: (username: string | null) => void;
  setAnalysis: (contractAddress: string, data: CaAnalysisResult) => void;
  setCurrentContract: (address: string | null) => void;
  toggleSidebar: () => void;
  addPanel: (panel: Omit<Panel, "zIndex" | "minimized">) => void;
  closePanel: (id: string) => void;
  minimizePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  focusPanel: (id: string) => void;
  movePanel: (id: string, x: number, y: number) => void;
  openAnalysisPanels: (contractAddress: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  bootComplete: false,
  user: null,
  panels: [],
  activeProcesses: 0,
  sidebarOpen: true,
  searchHistory: [],
  nextZIndex: 1,
  currentContract: null,
  analysisByContract: {},
  lastQueryMs: null,
  analyzeError: null,
  telegramBotUsername: null,
  setBootComplete: (value) => set({ bootComplete: value }),
  setUser: (user) => set({ user }),
  setSearchHistory: (items) => set({ searchHistory: items }),
  setActiveProcesses: (count) => set({ activeProcesses: count }),
  setLastQueryMs: (ms) => set({ lastQueryMs: ms }),
  setAnalyzeError: (error) => set({ analyzeError: error }),
  setTelegramBotUsername: (username) => set({ telegramBotUsername: username }),
  setAnalysis: (contractAddress, data) =>
    set((s) => ({
      analysisByContract: {
        ...s.analysisByContract,
        [contractAddress]: data,
      },
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
        panels: [
          ...s.panels,
          { ...panel, minimized: false, zIndex: s.nextZIndex },
        ],
        nextZIndex: s.nextZIndex + 1,
      };
    }),
  closePanel: (id) =>
    set((s) => ({ panels: s.panels.filter((p) => p.id !== id) })),
  minimizePanel: (id) =>
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === id ? { ...p, minimized: true } : p
      ),
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
        (p) => p.id !== "welcome" && !p.id.startsWith("overview-") && !p.id.startsWith("roster-")
      );

      const overviewPanel: Panel = {
        id: overviewId,
        type: "TOKEN_OVERVIEW",
        title: "TOKEN_OVERVIEW.EXE",
        x: 32,
        y: 80,
        width: 480,
        height: 360,
        minimized: false,
        zIndex: s.nextZIndex,
        contractAddress,
      };

      const rosterPanel: Panel = {
        id: rosterId,
        type: "HOLDER_ROSTER",
        title: "HOLDER_ROSTER.EXE",
        x: 540,
        y: 80,
        width: 520,
        height: 420,
        minimized: false,
        zIndex: s.nextZIndex + 1,
        contractAddress,
      };

      return {
        panels: [...basePanels, overviewPanel, rosterPanel],
        nextZIndex: s.nextZIndex + 2,
        currentContract: contractAddress,
      };
    }),
}));
