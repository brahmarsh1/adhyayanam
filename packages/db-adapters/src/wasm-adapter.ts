import initSqlJs, { type Database } from "sql.js";
import { get, set } from "idb-keyval";
import { sm2 } from "@adhyayanam/shared";
import type {
  DbAdapter,
  Veda,
  Division,
  Subdivision,
  Verse,
  WordAnnotation,
  StudyCard,
  SrsCard,
  SrsUpdate,
  DashboardStats,
  DrillMode,
  Quality,
} from "@adhyayanam/shared";

const IDB_KEY = "adhyayanam-db";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS vedas (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  name_devanagari TEXT NOT NULL, name_display TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS divisions (
  id INTEGER PRIMARY KEY, veda_id INTEGER NOT NULL REFERENCES vedas(id),
  number INTEGER NOT NULL, name TEXT NOT NULL, name_devanagari TEXT,
  UNIQUE(veda_id, number)
);
CREATE TABLE IF NOT EXISTS subdivisions (
  id INTEGER PRIMARY KEY, division_id INTEGER NOT NULL REFERENCES divisions(id),
  number INTEGER NOT NULL, name TEXT, rishi TEXT, devata TEXT, chandas TEXT,
  UNIQUE(division_id, number)
);
CREATE TABLE IF NOT EXISTS anuvakas (
  id INTEGER PRIMARY KEY, subdivision_id INTEGER NOT NULL REFERENCES subdivisions(id),
  number INTEGER NOT NULL, UNIQUE(subdivision_id, number)
);
CREATE TABLE IF NOT EXISTS verses (
  id INTEGER PRIMARY KEY, veda_id INTEGER NOT NULL REFERENCES vedas(id),
  subdivision_id INTEGER NOT NULL REFERENCES subdivisions(id),
  anuvaka_id INTEGER REFERENCES anuvakas(id),
  verse_number INTEGER NOT NULL, reference TEXT NOT NULL UNIQUE,
  text_devanagari TEXT NOT NULL, text_baraha TEXT,
  padapatha_devanagari TEXT, padapatha_baraha TEXT,
  kramapatha_devanagari TEXT, kramapatha_baraha TEXT,
  jatapatha_devanagari TEXT, jatapatha_baraha TEXT,
  ghanapatha_devanagari TEXT, ghanapatha_baraha TEXT,
  rishi TEXT, devata TEXT, chandas TEXT
);
CREATE TABLE IF NOT EXISTS word_annotations (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL REFERENCES verses(id),
  position INTEGER NOT NULL, word TEXT NOT NULL,
  lemma TEXT, verbal_root TEXT, pos TEXT,
  case_num INTEGER, number_num INTEGER, gender_num INTEGER,
  UNIQUE(verse_id, position)
);
CREATE TABLE IF NOT EXISTS srs_cards (
  id INTEGER PRIMARY KEY, verse_id INTEGER NOT NULL REFERENCES verses(id),
  drill_mode TEXT NOT NULL, ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0, repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date TEXT NOT NULL, last_review_date TEXT,
  total_reviews INTEGER NOT NULL DEFAULT 0, correct_reviews INTEGER NOT NULL DEFAULT 0,
  UNIQUE(verse_id, drill_mode)
);
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL UNIQUE,
  reviews_completed INTEGER NOT NULL DEFAULT 0,
  new_cards_studied INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0, total_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings (key, value) VALUES ('new_cards_per_day', '5');
INSERT OR IGNORE INTO settings (key, value) VALUES ('max_reviews_per_day', '100');
INSERT OR IGNORE INTO settings (key, value) VALUES ('display_script', 'both');
INSERT OR IGNORE INTO settings (key, value) VALUES ('font_size', '20');
`;

/**
 * Database adapter for web and mobile — uses sql.js (SQLite compiled to WASM).
 * The DB is fetched via HTTP on first load and cached in IndexedDB.
 */
export class WasmAdapter implements DbAdapter {
  private db!: Database;
  private dbUrl: string;

  constructor(dbUrl: string = "/adhyayanam.db") {
    this.dbUrl = dbUrl;
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });

    // Try loading from IndexedDB cache first
    const cached = await get<ArrayBuffer>(IDB_KEY).catch(() => null);
    if (cached) {
      this.db = new SQL.Database(new Uint8Array(cached));
    } else {
      // Fetch the pre-built database
      const response = await fetch(this.dbUrl);
      const buf = await response.arrayBuffer();
      this.db = new SQL.Database(new Uint8Array(buf));
      await set(IDB_KEY, buf);
    }

    // Ensure schema exists
    this.db.run(SCHEMA_SQL);
  }

  private persist(): void {
    const data = this.db.export();
    set(IDB_KEY, data.buffer).catch(console.error);
  }

  // --- Corpus ---

  async getVedas(): Promise<Veda[]> {
    const stmt = this.db.prepare(
      "SELECT id, name, name_devanagari, name_display FROM vedas ORDER BY id"
    );
    const rows: Veda[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      rows.push(r as unknown as Veda);
    }
    stmt.free();
    return rows;
  }

  async getDivisions(vedaId: number): Promise<Division[]> {
    const stmt = this.db.prepare(
      "SELECT id, veda_id, number, name, name_devanagari FROM divisions WHERE veda_id = ? ORDER BY number"
    );
    stmt.bind([vedaId]);
    const rows: Division[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as Division);
    stmt.free();
    return rows;
  }

  async getSubdivisions(divisionId: number): Promise<Subdivision[]> {
    const stmt = this.db.prepare(
      `SELECT s.id, s.division_id, s.number, s.name, s.rishi, s.devata, s.chandas,
              (SELECT COUNT(*) FROM verses v WHERE v.subdivision_id = s.id) as verse_count
       FROM subdivisions s WHERE s.division_id = ? ORDER BY s.number`
    );
    stmt.bind([divisionId]);
    const rows: Subdivision[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as Subdivision);
    stmt.free();
    return rows;
  }

  async getVerses(subdivisionId: number): Promise<Verse[]> {
    const stmt = this.db.prepare(
      `SELECT id, veda_id, subdivision_id, verse_number, reference,
              text_devanagari, text_baraha, padapatha_devanagari, padapatha_baraha,
              kramapatha_devanagari, kramapatha_baraha,
              jatapatha_devanagari, jatapatha_baraha,
              ghanapatha_devanagari, ghanapatha_baraha,
              rishi, devata, chandas
       FROM verses WHERE subdivision_id = ? ORDER BY verse_number`
    );
    stmt.bind([subdivisionId]);
    const rows: Verse[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as Verse);
    stmt.free();
    return rows;
  }

  async getVerse(verseId: number): Promise<Verse> {
    const stmt = this.db.prepare(
      `SELECT id, veda_id, subdivision_id, verse_number, reference,
              text_devanagari, text_baraha, padapatha_devanagari, padapatha_baraha,
              kramapatha_devanagari, kramapatha_baraha,
              jatapatha_devanagari, jatapatha_baraha,
              ghanapatha_devanagari, ghanapatha_baraha,
              rishi, devata, chandas
       FROM verses WHERE id = ?`
    );
    stmt.bind([verseId]);
    stmt.step();
    const row = stmt.getAsObject() as unknown as Verse;
    stmt.free();
    return row;
  }

  async getWordAnnotations(verseId: number): Promise<WordAnnotation[]> {
    const stmt = this.db.prepare(
      "SELECT position, word, lemma, verbal_root, pos FROM word_annotations WHERE verse_id = ? ORDER BY position"
    );
    stmt.bind([verseId]);
    const rows: WordAnnotation[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as unknown as WordAnnotation);
    stmt.free();
    return rows;
  }

  // --- SRS ---

  async getDueCards(limit: number, drillModes: DrillMode[]): Promise<StudyCard[]> {
    const t = today();
    const placeholders = drillModes.map(() => "?").join(",");
    const stmt = this.db.prepare(
      `SELECT c.id, c.verse_id, c.drill_mode, c.ease_factor, c.interval_days, c.repetitions,
              c.next_review_date, c.last_review_date, c.total_reviews, c.correct_reviews,
              v.id as v_id, v.veda_id, v.subdivision_id, v.verse_number, v.reference,
              v.text_devanagari, v.text_baraha, v.padapatha_devanagari, v.padapatha_baraha,
              v.kramapatha_devanagari, v.kramapatha_baraha,
              v.jatapatha_devanagari, v.jatapatha_baraha,
              v.ghanapatha_devanagari, v.ghanapatha_baraha,
              v.rishi, v.devata, v.chandas
       FROM srs_cards c JOIN verses v ON c.verse_id = v.id
       WHERE c.next_review_date <= ? AND c.drill_mode IN (${placeholders})
       ORDER BY c.next_review_date ASC, c.ease_factor ASC
       LIMIT ?`
    );
    stmt.bind([t, ...drillModes, limit]);
    const rows: StudyCard[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as any;
      rows.push({
        card: {
          id: r.id, verse_id: r.verse_id, drill_mode: r.drill_mode,
          ease_factor: r.ease_factor, interval_days: r.interval_days,
          repetitions: r.repetitions, next_review_date: r.next_review_date,
          last_review_date: r.last_review_date, total_reviews: r.total_reviews,
          correct_reviews: r.correct_reviews,
        },
        verse: {
          id: r.v_id, veda_id: r.veda_id, subdivision_id: r.subdivision_id,
          verse_number: r.verse_number, reference: r.reference,
          text_devanagari: r.text_devanagari, text_baraha: r.text_baraha,
          padapatha_devanagari: r.padapatha_devanagari, padapatha_baraha: r.padapatha_baraha,
          kramapatha_devanagari: r.kramapatha_devanagari, kramapatha_baraha: r.kramapatha_baraha,
          jatapatha_devanagari: r.jatapatha_devanagari, jatapatha_baraha: r.jatapatha_baraha,
          ghanapatha_devanagari: r.ghanapatha_devanagari, ghanapatha_baraha: r.ghanapatha_baraha,
          rishi: r.rishi, devata: r.devata, chandas: r.chandas,
        },
      });
    }
    stmt.free();
    return rows;
  }

  async addVersesToStudy(subdivisionId: number, drillModes: DrillMode[]): Promise<number> {
    const t = today();
    const verseStmt = this.db.prepare(
      "SELECT id FROM verses WHERE subdivision_id = ? ORDER BY verse_number"
    );
    verseStmt.bind([subdivisionId]);
    const verseIds: number[] = [];
    while (verseStmt.step()) verseIds.push(verseStmt.getAsObject().id as number);
    verseStmt.free();

    let count = 0;
    for (const vid of verseIds) {
      for (const mode of drillModes) {
        const changes = this.db.run(
          `INSERT OR IGNORE INTO srs_cards
           (verse_id, drill_mode, ease_factor, interval_days, repetitions, next_review_date, total_reviews, correct_reviews)
           VALUES (?, ?, 2.5, 0, 0, ?, 0, 0)`,
          [vid, mode, t]
        );
        count += this.db.getRowsModified();
      }
    }
    this.persist();
    return count;
  }

  async submitReview(cardId: number, quality: number): Promise<SrsUpdate> {
    const t = today();
    const stmt = this.db.prepare(
      "SELECT repetitions, ease_factor, interval_days FROM srs_cards WHERE id = ?"
    );
    stmt.bind([cardId]);
    stmt.step();
    const card = stmt.getAsObject() as any;
    stmt.free();

    const update = sm2({
      quality: quality as Quality,
      repetitions: card.repetitions,
      easeFactor: card.ease_factor,
      intervalDays: card.interval_days,
    });

    const nextReviewDate = addDays(t, update.intervalDays);
    const correct = quality >= 3 ? 1 : 0;

    this.db.run(
      `UPDATE srs_cards SET ease_factor = ?, interval_days = ?, repetitions = ?,
       next_review_date = ?, last_review_date = ?,
       total_reviews = total_reviews + 1,
       correct_reviews = correct_reviews + ?
       WHERE id = ?`,
      [update.easeFactor, update.intervalDays, update.repetitions, nextReviewDate, t, correct, cardId]
    );

    this.db.run(
      `INSERT INTO daily_stats (date, reviews_completed, new_cards_studied, correct_count, total_count)
       VALUES (?, 1, 0, ?, 1)
       ON CONFLICT(date) DO UPDATE SET
         reviews_completed = reviews_completed + 1,
         correct_count = correct_count + ?,
         total_count = total_count + 1`,
      [t, correct, correct]
    );

    this.persist();

    return {
      ease_factor: update.easeFactor,
      interval_days: update.intervalDays,
      repetitions: update.repetitions,
      next_review_date: nextReviewDate,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const t = today();
    const q = (sql: string, params: any[] = []) => {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      const val = stmt.getAsObject();
      stmt.free();
      return val;
    };

    const due = q("SELECT COUNT(*) as n FROM srs_cards WHERE next_review_date <= ?", [t]);
    const reviewed = q("SELECT COALESCE(SUM(reviews_completed), 0) as n FROM daily_stats WHERE date = ?", [t]);
    const total = q("SELECT COUNT(*) as n FROM verses");
    const mature = q("SELECT COUNT(DISTINCT verse_id) as n FROM srs_cards WHERE interval_days >= 21");
    const learning = q("SELECT COUNT(DISTINCT verse_id) as n FROM srs_cards WHERE interval_days > 0 AND interval_days < 21");
    const newAvail = q("SELECT COUNT(*) as n FROM verses v WHERE NOT EXISTS (SELECT 1 FROM srs_cards c WHERE c.verse_id = v.id)");

    const sevenAgo = addDays(t, -7);
    const acc = q("SELECT COALESCE(SUM(correct_count), 0) as c, COALESCE(SUM(total_count), 0) as t FROM daily_stats WHERE date >= ?", [sevenAgo]);
    const accuracy = (acc.t as number) > 0 ? (acc.c as number) / (acc.t as number) : 0;

    // Streak
    let streak = 0;
    let checkDate = t;
    while (true) {
      const r = q("SELECT COALESCE(reviews_completed, 0) as n FROM daily_stats WHERE date = ?", [checkDate]);
      if ((r.n as number) > 0) {
        streak++;
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }

    return {
      due_today: due.n as number,
      reviewed_today: reviewed.n as number,
      new_available: newAvail.n as number,
      total_verses: total.n as number,
      mature_count: mature.n as number,
      learning_count: learning.n as number,
      accuracy_7d: accuracy,
      current_streak: streak,
    };
  }

  async getSetting(key: string): Promise<string | null> {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    stmt.bind([key]);
    if (stmt.step()) {
      const val = stmt.getAsObject().value as string;
      stmt.free();
      return val;
    }
    stmt.free();
    return null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    this.persist();
  }
}
