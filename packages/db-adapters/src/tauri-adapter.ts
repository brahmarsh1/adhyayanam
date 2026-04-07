import { invoke } from "@tauri-apps/api/core";
import type {
  DbAdapter,
  Veda,
  Division,
  Subdivision,
  Verse,
  WordAnnotation,
  StudyCard,
  SrsUpdate,
  DashboardStats,
  DrillMode,
} from "@adhyayanam/shared";

/**
 * Database adapter for Tauri desktop — delegates to Rust backend via invoke().
 */
export class TauriAdapter implements DbAdapter {
  async init() {
    // Rust backend handles DB initialization in setup()
  }

  async getVedas(): Promise<Veda[]> {
    return invoke("get_vedas");
  }

  async getDivisions(vedaId: number): Promise<Division[]> {
    return invoke("get_divisions", { vedaId });
  }

  async getSubdivisions(divisionId: number): Promise<Subdivision[]> {
    return invoke("get_subdivisions", { divisionId });
  }

  async getVerses(subdivisionId: number): Promise<Verse[]> {
    return invoke("get_verses", { subdivisionId });
  }

  async getVerse(verseId: number): Promise<Verse> {
    return invoke("get_verse", { verseId });
  }

  async getWordAnnotations(verseId: number): Promise<WordAnnotation[]> {
    return invoke("get_word_annotations", { verseId });
  }

  async getDueCards(limit: number, drillModes: DrillMode[]): Promise<StudyCard[]> {
    return invoke("get_due_cards", { limit, drillModes });
  }

  async addVersesToStudy(subdivisionId: number, drillModes: DrillMode[]): Promise<number> {
    return invoke("add_verses_to_study", { subdivisionId, drillModes });
  }

  async submitReview(cardId: number, quality: number): Promise<SrsUpdate> {
    return invoke("submit_review", { cardId, quality });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return invoke("get_dashboard_stats");
  }

  async getSetting(key: string): Promise<string | null> {
    return invoke("get_setting", { key });
  }

  async setSetting(key: string, value: string): Promise<void> {
    return invoke("set_setting", { key, value });
  }
}
