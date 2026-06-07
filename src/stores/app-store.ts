import { create } from "zustand";

import type {
  CaAnalysisResult,
  CrossAnalysisResult,
  FundTraceResult,
  WalletProfile,
  WalletTrackSnapshot,
} from "@/lib/analyze/types";



export type PanelType =

  | "TOKEN_OVERVIEW"

  | "HOLDER_ROSTER"

  | "WALLET_PROFILE"

  | "WALLET_TRACK"

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

  maximized: boolean;

  zIndex: number;

  groupId: string;

  contractAddress?: string;

  walletAddress?: string;

  compareContracts?: string[];

}



export interface SearchHistoryItem {

  id: number;

  contractAddress: string;

  tokenSymbol: string | null;

  tokenName: string | null;

  searchedAt: string;

}



export interface TrackedWalletItem {

  id: number;

  walletAddress: string;

  label: string | null;

  sourceContract: string | null;

  notes: string | null;

  createdAt: string;

  lastCheckedAt: string | null;

}



export interface SessionUser {

  userId: number;

  telegramId: number;

  username?: string;

  firstName?: string;

  isPro?: boolean;

  isAdmin?: boolean;

}



export interface GuestSession {

  guestId: string;

  searchesUsed: number;

  searchesRemaining: number;

  searchesLimit: number;

}



export type SidebarTab = "searches" | "tracked";



interface AppState {

  bootComplete: boolean;

  user: SessionUser | null;

  guest: GuestSession | null;

  panels: Panel[];

  activeTabByGroup: Record<string, string>;

  activeProcesses: number;

  sidebarOpen: boolean;

  sidebarTab: SidebarTab;

  searchHistory: SearchHistoryItem[];

  trackedWallets: TrackedWalletItem[];

  nextZIndex: number;

  currentContract: string | null;

  analysisByContract: Record<string, CaAnalysisResult>;

  walletProfiles: Record<string, WalletProfile>;

  walletTracks: Record<string, WalletTrackSnapshot>;

  crossAnalysisResults: Record<string, CrossAnalysisResult>;

  fundTraceResults: Record<string, FundTraceResult>;

  crossCompareSelection: string[];

  lastQueryMs: number | null;

  analyzeError: string | null;

  telegramBotUsername: string | null;

  isAuthenticated: () => boolean;

  setBootComplete: (value: boolean) => void;

  setUser: (user: SessionUser | null) => void;

  setGuest: (guest: GuestSession | null) => void;

  setSearchHistory: (items: SearchHistoryItem[]) => void;

  setTrackedWallets: (items: TrackedWalletItem[]) => void;

  setSidebarTab: (tab: SidebarTab) => void;

  setActiveProcesses: (count: number) => void;

  setLastQueryMs: (ms: number | null) => void;

  setAnalyzeError: (error: string | null) => void;

  setTelegramBotUsername: (username: string | null) => void;

  setAnalysis: (contractAddress: string, data: CaAnalysisResult) => void;

  setWalletProfile: (key: string, profile: WalletProfile) => void;

  setWalletTrack: (key: string, snapshot: WalletTrackSnapshot) => void;

  setCrossAnalysis: (key: string, result: CrossAnalysisResult) => void;

  setFundTrace: (contractAddress: string, result: FundTraceResult) => void;

  toggleCrossCompare: (contractAddress: string) => void;

  clearCrossCompare: () => void;

  setCurrentContract: (address: string | null) => void;

  toggleSidebar: () => void;

  addPanel: (panel: Omit<Panel, "zIndex" | "minimized" | "maximized" | "groupId">) => void;

  closePanel: (id: string) => void;

  closeGroup: (groupId: string) => void;

  minimizeGroup: (groupId: string) => void;

  restoreGroup: (groupId: string) => void;

  toggleMaximizeGroup: (groupId: string) => void;

  focusGroup: (groupId: string) => void;

  moveGroup: (groupId: string, x: number, y: number) => void;

  resizeGroup: (groupId: string, width: number, height: number) => void;

  setActiveTab: (groupId: string, tabId: string) => void;

  mergePanels: (sourceId: string, targetGroupId: string) => void;

  detachPanel: (panelId: string) => void;

  openAnalysisPanels: (contractAddress: string) => void;

  openWalletPanel: (

    walletAddress: string,

    contractAddress: string,

    rank: number

  ) => void;

  openTrackPanel: (

    walletAddress: string,

    contractAddress?: string | null,

    label?: string | null

  ) => void;

  openCrossAnalysisPanel: (contracts: string[]) => void;

  openFundTracerPanel: (contractAddress: string) => void;

}



export function walletProfileKey(wallet: string, contract: string) {

  return `${wallet}|${contract}`;

}



export function walletTrackKey(wallet: string) {

  return wallet.toLowerCase();

}



export function crossAnalysisKey(contracts: string[]) {

  return contracts

    .map((c) => c.toLowerCase())

    .sort()

    .join("|");

}



function hostPanel(panels: Panel[], groupId: string): Panel | undefined {

  return panels.find((p) => p.id === groupId) ?? panels.find((p) => p.groupId === groupId);

}



function withPanelDefaults(

  panel: Omit<Panel, "zIndex" | "minimized" | "maximized" | "groupId">,

  zIndex: number

): Panel {

  return {

    ...panel,

    groupId: panel.id,

    minimized: false,

    maximized: false,

    zIndex,

  };

}



export const useAppStore = create<AppState>((set, get) => ({

  bootComplete: false,

  user: null,

  guest: null,

  panels: [],

  activeTabByGroup: {},

  activeProcesses: 0,

  sidebarOpen: true,

  sidebarTab: "searches",

  searchHistory: [],

  trackedWallets: [],

  nextZIndex: 1,

  currentContract: null,

  analysisByContract: {},

  walletProfiles: {},

  walletTracks: {},

  crossAnalysisResults: {},

  fundTraceResults: {},

  crossCompareSelection: [],

  lastQueryMs: null,

  analyzeError: null,

  telegramBotUsername: null,

  isAuthenticated: () => Boolean(get().user || get().guest),

  setBootComplete: (value) => set({ bootComplete: value }),

  setUser: (user) => set({ user, guest: user ? null : get().guest }),

  setGuest: (guest) => set({ guest, user: guest ? null : get().user }),

  setSearchHistory: (items) => set({ searchHistory: items }),

  setTrackedWallets: (items) => set({ trackedWallets: items }),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),

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

  setWalletTrack: (key, snapshot) =>

    set((s) => ({

      walletTracks: { ...s.walletTracks, [key]: snapshot },

    })),

  setCrossAnalysis: (key, result) =>

    set((s) => ({

      crossAnalysisResults: { ...s.crossAnalysisResults, [key]: result },

    })),

  setFundTrace: (contractAddress, result) =>

    set((s) => ({

      fundTraceResults: { ...s.fundTraceResults, [contractAddress]: result },

    })),

  toggleCrossCompare: (contractAddress) =>

    set((s) => {

      const lower = contractAddress.toLowerCase();

      const selected = s.crossCompareSelection.map((c) => c.toLowerCase());

      if (selected.includes(lower)) {

        return {

          crossCompareSelection: selected.filter((c) => c !== lower),

        };

      }

      if (selected.length >= 5) return s;

      return { crossCompareSelection: [...selected, lower] };

    }),

  clearCrossCompare: () => set({ crossCompareSelection: [] }),

  setCurrentContract: (address) => set({ currentContract: address }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addPanel: (panel) =>

    set((s) => {

      const exists = s.panels.some((p) => p.id === panel.id);

      const next = withPanelDefaults(panel, s.nextZIndex);

      if (exists) {

        return {

          panels: s.panels.map((p) =>

            p.id === panel.id

              ? { ...p, minimized: false, zIndex: s.nextZIndex }

              : p

          ),

          activeTabByGroup: { ...s.activeTabByGroup, [panel.id]: panel.id },

          nextZIndex: s.nextZIndex + 1,

        };

      }

      return {

        panels: [...s.panels, next],

        activeTabByGroup: { ...s.activeTabByGroup, [panel.id]: panel.id },

        nextZIndex: s.nextZIndex + 1,

      };

    }),

  closePanel: (id) =>

    set((s) => {

      const panel = s.panels.find((p) => p.id === id);

      if (!panel) return s;

      const groupId = panel.groupId;

      const remaining = s.panels.filter((p) => p.id !== id);

      const inGroup = remaining.filter((p) => p.groupId === groupId);

      if (inGroup.length === 0) {

        const { [groupId]: _, ...activeTabByGroup } = s.activeTabByGroup;

        return { panels: remaining, activeTabByGroup };

      }

      const newHost = inGroup[0];

      const promoted = remaining.map((p) =>

        p.groupId === groupId ? { ...p, groupId: newHost.id, x: newHost.x, y: newHost.y, width: newHost.width, height: newHost.height } : p

      );

      return {

        panels: promoted,

        activeTabByGroup: {

          ...s.activeTabByGroup,

          [newHost.id]: s.activeTabByGroup[groupId] === id ? newHost.id : (s.activeTabByGroup[groupId] ?? newHost.id),

        },

      };

    }),

  closeGroup: (groupId) =>

    set((s) => {

      const { [groupId]: _, ...activeTabByGroup } = s.activeTabByGroup;

      return {

        panels: s.panels.filter((p) => p.groupId !== groupId),

        activeTabByGroup,

      };

    }),

  minimizeGroup: (groupId) =>

    set((s) => ({

      panels: s.panels.map((p) =>

        p.groupId === groupId ? { ...p, minimized: true, maximized: false } : p

      ),

    })),

  restoreGroup: (groupId) =>

    set((s) => ({

      panels: s.panels.map((p) =>

        p.groupId === groupId

          ? { ...p, minimized: false, zIndex: s.nextZIndex }

          : p

      ),

      nextZIndex: s.nextZIndex + 1,

    })),

  toggleMaximizeGroup: (groupId) =>

    set((s) => {

      const host = hostPanel(s.panels, groupId);

      const nextMax = !host?.maximized;

      return {

        panels: s.panels.map((p) =>

          p.groupId === groupId

            ? { ...p, maximized: nextMax, minimized: false, zIndex: s.nextZIndex }

            : p

        ),

        nextZIndex: s.nextZIndex + 1,

      };

    }),

  focusGroup: (groupId) =>

    set((s) => ({

      panels: s.panels.map((p) =>

        p.groupId === groupId ? { ...p, zIndex: s.nextZIndex } : p

      ),

      nextZIndex: s.nextZIndex + 1,

    })),

  moveGroup: (groupId, x, y) =>

    set((s) => ({

      panels: s.panels.map((p) => (p.groupId === groupId ? { ...p, x, y } : p)),

    })),

  resizeGroup: (groupId, width, height) =>

    set((s) => ({

      panels: s.panels.map((p) =>

        p.groupId === groupId ? { ...p, width, height } : p

      ),

    })),

  setActiveTab: (groupId, tabId) =>

    set((s) => ({

      activeTabByGroup: { ...s.activeTabByGroup, [groupId]: tabId },

    })),

  mergePanels: (sourceId, targetGroupId) =>

    set((s) => {

      const source = s.panels.find((p) => p.id === sourceId);

      const target = hostPanel(s.panels, targetGroupId);

      if (!source || !target || source.groupId === target.groupId) return s;



      const merged = s.panels.map((p) => {

        if (p.id === sourceId) {

          return {

            ...p,

            groupId: target.groupId,

            x: target.x,

            y: target.y,

            width: target.width,

            height: target.height,

            minimized: target.minimized,

            maximized: target.maximized,

            zIndex: s.nextZIndex,

          };

        }

        if (p.groupId === source.groupId && p.id !== sourceId) {

          return {

            ...p,

            groupId: target.groupId,

            x: target.x,

            y: target.y,

            width: target.width,

            height: target.height,

          };

        }

        return p;

      });



      const { [source.groupId]: _removed, ...restTabs } = s.activeTabByGroup;



      return {

        panels: merged,

        activeTabByGroup: {

          ...restTabs,

          [target.groupId]: sourceId,

        },

        nextZIndex: s.nextZIndex + 1,

      };

    }),

  detachPanel: (panelId) =>

    set((s) => {

      const panel = s.panels.find((p) => p.id === panelId);

      if (!panel) return s;

      const offset = 28;

      return {

        panels: s.panels.map((p) =>

          p.id === panelId

            ? {

                ...p,

                groupId: panelId,

                x: p.x + offset,

                y: p.y + offset,

                maximized: false,

                zIndex: s.nextZIndex,

              }

            : p

        ),

        activeTabByGroup: { ...s.activeTabByGroup, [panelId]: panelId },

        nextZIndex: s.nextZIndex + 1,

      };

    }),

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



      const overview = withPanelDefaults(

        {

          id: overviewId,

          type: "TOKEN_OVERVIEW",

          title: "TOKEN_OVERVIEW.EXE",

          x: 32,

          y: 80,

          width: 480,

          height: 360,

          contractAddress,

        },

        s.nextZIndex

      );

      const roster = withPanelDefaults(

        {

          id: rosterId,

          type: "HOLDER_ROSTER",

          title: "HOLDER_ROSTER.EXE",

          x: 540,

          y: 80,

          width: 520,

          height: 420,

          contractAddress,

        },

        s.nextZIndex + 1

      );



      return {

        panels: [...basePanels, overview, roster],

        activeTabByGroup: {

          ...s.activeTabByGroup,

          [overviewId]: overviewId,

          [rosterId]: rosterId,

        },

        nextZIndex: s.nextZIndex + 2,

        currentContract: contractAddress,

      };

    }),

  openWalletPanel: (walletAddress, contractAddress, rank) =>

    set((s) => {

      const id = `wallet-${walletAddress}-${contractAddress}`;

      const offset = (rank % 5) * 24;

      const panel = withPanelDefaults(

        {

          id,

          type: "WALLET_PROFILE",

          title: `WALLET #${rank}`,

          x: 80 + offset,

          y: 120 + offset,

          width: 460,

          height: 480,

          contractAddress,

          walletAddress,

        },

        s.nextZIndex

      );

      const exists = s.panels.some((p) => p.id === id);

      if (exists) {

        return {

          panels: s.panels.map((p) =>

            p.id === id ? { ...p, minimized: false, zIndex: s.nextZIndex } : p

          ),

          activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

          nextZIndex: s.nextZIndex + 1,

        };

      }

      return {

        panels: [...s.panels, panel],

        activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

        nextZIndex: s.nextZIndex + 1,

      };

    }),

  openTrackPanel: (walletAddress, contractAddress, label) =>

    set((s) => {

      const id = `track-${walletAddress}`;

      const offset = (s.panels.length % 6) * 20;

      const panel = withPanelDefaults(

        {

          id,

          type: "WALLET_TRACK",

          title: label ? `TRACK · ${label}` : `TRACK · ${walletAddress.slice(0, 8)}`,

          x: 100 + offset,

          y: 140 + offset,

          width: 500,

          height: 520,

          contractAddress: contractAddress ?? undefined,

          walletAddress,

        },

        s.nextZIndex

      );

      const exists = s.panels.some((p) => p.id === id);

      if (exists) {

        return {

          panels: s.panels.map((p) =>

            p.id === id ? { ...p, minimized: false, zIndex: s.nextZIndex } : p

          ),

          activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

          nextZIndex: s.nextZIndex + 1,

        };

      }

      return {

        panels: [...s.panels, panel],

        activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

        nextZIndex: s.nextZIndex + 1,

      };

    }),

  openCrossAnalysisPanel: (contracts) =>

    set((s) => {

      const key = crossAnalysisKey(contracts);

      const id = `cross-${key.slice(0, 48)}`;

      const panel = withPanelDefaults(

        {

          id,

          type: "CROSS_ANALYSIS",

          title: "CROSS_ANALYSIS.EXE",

          x: 160,

          y: 100,

          width: 560,

          height: 500,

          compareContracts: contracts,

        },

        s.nextZIndex

      );

      const exists = s.panels.some((p) => p.id === id);

      if (exists) {

        return {

          panels: s.panels.map((p) =>

            p.id === id ? { ...p, minimized: false, zIndex: s.nextZIndex } : p

          ),

          activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

          nextZIndex: s.nextZIndex + 1,

        };

      }

      return {

        panels: [...s.panels, panel],

        activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

        nextZIndex: s.nextZIndex + 1,

      };

    }),

  openFundTracerPanel: (contractAddress) =>

    set((s) => {

      const id = `fund-trace-${contractAddress}`;

      const panel = withPanelDefaults(

        {

          id,

          type: "FUND_TRACER",

          title: "FUND_TRACER.EXE",

          x: 200,

          y: 110,

          width: 520,

          height: 480,

          contractAddress,

        },

        s.nextZIndex

      );

      const exists = s.panels.some((p) => p.id === id);

      if (exists) {

        return {

          panels: s.panels.map((p) =>

            p.id === id ? { ...p, minimized: false, zIndex: s.nextZIndex } : p

          ),

          activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

          nextZIndex: s.nextZIndex + 1,

        };

      }

      return {

        panels: [...s.panels, panel],

        activeTabByGroup: { ...s.activeTabByGroup, [id]: id },

        nextZIndex: s.nextZIndex + 1,

      };

    }),

}));



export function getWindowGroups(panels: Panel[]) {

  const groups = new Map<string, Panel[]>();

  for (const panel of panels) {

    const list = groups.get(panel.groupId) ?? [];

    list.push(panel);

    groups.set(panel.groupId, list);

  }

  return groups;

}


