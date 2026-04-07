import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { DrillMode } from "../types";

interface SettingsState {
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  displayScript: "devanagari" | "baraha" | "both";
  fontSize: number;
  enabledDrillModes: DrillMode[];
  loaded: boolean;
  load: () => Promise<void>;
  update: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  newCardsPerDay: 5,
  maxReviewsPerDay: 100,
  displayScript: "both",
  fontSize: 20,
  enabledDrillModes: ["recitation", "fill_blank", "metadata"],
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const ncpd = await invoke<string | null>("get_setting", { key: "new_cards_per_day" });
      const mrpd = await invoke<string | null>("get_setting", { key: "max_reviews_per_day" });
      const ds = await invoke<string | null>("get_setting", { key: "display_script" });
      const fs = await invoke<string | null>("get_setting", { key: "font_size" });
      const edm = await invoke<string | null>("get_setting", { key: "enabled_drill_modes" });

      set({
        newCardsPerDay: ncpd ? parseInt(ncpd) : 5,
        maxReviewsPerDay: mrpd ? parseInt(mrpd) : 100,
        displayScript: (ds as "devanagari" | "baraha" | "both") || "both",
        fontSize: fs ? parseInt(fs) : 20,
        enabledDrillModes: edm ? JSON.parse(edm) : ["recitation", "fill_blank", "metadata"],
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  update: async (key: string, value: string) => {
    await invoke("set_setting", { key, value });
    const map: Record<string, (v: string) => Partial<SettingsState>> = {
      new_cards_per_day: (v) => ({ newCardsPerDay: parseInt(v) }),
      max_reviews_per_day: (v) => ({ maxReviewsPerDay: parseInt(v) }),
      display_script: (v) => ({ displayScript: v as "devanagari" | "baraha" | "both" }),
      font_size: (v) => ({ fontSize: parseInt(v) }),
      enabled_drill_modes: (v) => ({ enabledDrillModes: JSON.parse(v) }),
    };
    if (map[key]) set(map[key](value));
  },
}));
