import type {
  Veda,
  Division,
  Subdivision,
  Verse,
  WordAnnotation,
  StudyCard,
  SrsUpdate,
  DashboardStats,
  DrillMode,
} from "../types";

export interface DbAdapter {
  init(): Promise<void>;

  // Corpus
  getVedas(): Promise<Veda[]>;
  getDivisions(vedaId: number): Promise<Division[]>;
  getSubdivisions(divisionId: number): Promise<Subdivision[]>;
  getVerses(subdivisionId: number): Promise<Verse[]>;
  getVerse(verseId: number): Promise<Verse>;
  getWordAnnotations(verseId: number): Promise<WordAnnotation[]>;

  // SRS
  getDueCards(limit: number, drillModes: DrillMode[]): Promise<StudyCard[]>;
  addVersesToStudy(subdivisionId: number, drillModes: DrillMode[]): Promise<number>;
  submitReview(cardId: number, quality: number): Promise<SrsUpdate>;
  getDashboardStats(): Promise<DashboardStats>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}
