import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: "light" | "dark";
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  setTheme: (theme: "light" | "dark") => void;
  closeSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  theme: "dark",
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleCollapse: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
  closeSidebar: () => set({ sidebarOpen: false }),
}));
