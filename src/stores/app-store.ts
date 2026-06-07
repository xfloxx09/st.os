import { create } from "zustand";

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
  setBootComplete: (value: boolean) => void;
  setUser: (user: SessionUser | null) => void;
  setSearchHistory: (items: SearchHistoryItem[]) => void;
  setActiveProcesses: (count: number) => void;
  toggleSidebar: () => void;
  addPanel: (panel: Omit<Panel, "zIndex" | "minimized">) => void;
  closePanel: (id: string) => void;
  minimizePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  focusPanel: (id: string) => void;
  movePanel: (id: string, x: number, y: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  bootComplete: false,
  user: null,
  panels: [],
  activeProcesses: 0,
  sidebarOpen: true,
  searchHistory: [],
  nextZIndex: 1,
  setBootComplete: (value) => set({ bootComplete: value }),
  setUser: (user) => set({ user }),
  setSearchHistory: (items) => set({ searchHistory: items }),
  setActiveProcesses: (count) => set({ activeProcesses: count }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  addPanel: (panel) =>
    set((s) => ({
      panels: [
        ...s.panels,
        { ...panel, minimized: false, zIndex: s.nextZIndex },
      ],
      nextZIndex: s.nextZIndex + 1,
    })),
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
}));
