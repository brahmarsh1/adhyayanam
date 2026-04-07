export interface Veda {
  id: number;
  name: string;
  name_devanagari: string;
  name_display: string;
}

export interface Division {
  id: number;
  veda_id: number;
  number: number;
  name: string;
  name_devanagari: string | null;
}

export interface Subdivision {
  id: number;
  division_id: number;
  number: number;
  name: string | null;
  rishi: string | null;
  devata: string | null;
  chandas: string | null;
  verse_count: number;
}

export interface Verse {
  id: number;
  veda_id: number;
  subdivision_id: number;
  verse_number: number;
  reference: string;
  text_devanagari: string;
  text_baraha: string | null;
  padapatha_devanagari: string | null;
  padapatha_baraha: string | null;
  kramapatha_devanagari: string | null;
  kramapatha_baraha: string | null;
  jatapatha_devanagari: string | null;
  jatapatha_baraha: string | null;
  ghanapatha_devanagari: string | null;
  ghanapatha_baraha: string | null;
  rishi: string | null;
  devata: string | null;
  chandas: string | null;
}

export interface SrsCard {
  id: number;
  verse_id: number;
  drill_mode: DrillMode;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
  last_review_date: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export interface StudyCard {
  card: SrsCard;
  verse: Verse;
}

export interface SrsUpdate {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string;
}

export interface DashboardStats {
  due_today: number;
  reviewed_today: number;
  new_available: number;
  total_verses: number;
  mature_count: number;
  learning_count: number;
  accuracy_7d: number;
  current_streak: number;
}

export interface WordAnnotation {
  position: number;
  word: string;
  lemma: string | null;
  verbal_root: string | null;
  pos: string | null;
}

export type DrillMode = "recitation" | "fill_blank" | "metadata";
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;
