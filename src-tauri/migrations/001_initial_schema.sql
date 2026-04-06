CREATE TABLE IF NOT EXISTS vedas (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  name_devanagari TEXT NOT NULL,
  name_display TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS divisions (
  id INTEGER PRIMARY KEY,
  veda_id INTEGER NOT NULL REFERENCES vedas(id),
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_devanagari TEXT,
  UNIQUE(veda_id, number)
);

CREATE TABLE IF NOT EXISTS subdivisions (
  id INTEGER PRIMARY KEY,
  division_id INTEGER NOT NULL REFERENCES divisions(id),
  number INTEGER NOT NULL,
  name TEXT,
  rishi TEXT,
  devata TEXT,
  chandas TEXT,
  UNIQUE(division_id, number)
);

CREATE TABLE IF NOT EXISTS anuvakas (
  id INTEGER PRIMARY KEY,
  subdivision_id INTEGER NOT NULL REFERENCES subdivisions(id),
  number INTEGER NOT NULL,
  UNIQUE(subdivision_id, number)
);

CREATE TABLE IF NOT EXISTS verses (
  id INTEGER PRIMARY KEY,
  veda_id INTEGER NOT NULL REFERENCES vedas(id),
  subdivision_id INTEGER NOT NULL REFERENCES subdivisions(id),
  anuvaka_id INTEGER REFERENCES anuvakas(id),
  verse_number INTEGER NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  text_devanagari TEXT NOT NULL,
  text_baraha TEXT,
  padapatha_devanagari TEXT,
  padapatha_baraha TEXT,
  kramapatha_devanagari TEXT,
  kramapatha_baraha TEXT,
  jatapatha_devanagari TEXT,
  jatapatha_baraha TEXT,
  ghanapatha_devanagari TEXT,
  ghanapatha_baraha TEXT,
  rishi TEXT,
  devata TEXT,
  chandas TEXT
);

CREATE TABLE IF NOT EXISTS word_annotations (
  id INTEGER PRIMARY KEY,
  verse_id INTEGER NOT NULL REFERENCES verses(id),
  position INTEGER NOT NULL,
  word TEXT NOT NULL,
  lemma TEXT,
  verbal_root TEXT,
  pos TEXT,
  case_num INTEGER,
  number_num INTEGER,
  gender_num INTEGER,
  UNIQUE(verse_id, position)
);

CREATE TABLE IF NOT EXISTS srs_cards (
  id INTEGER PRIMARY KEY,
  verse_id INTEGER NOT NULL REFERENCES verses(id),
  drill_mode TEXT NOT NULL,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_date TEXT NOT NULL,
  last_review_date TEXT,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  correct_reviews INTEGER NOT NULL DEFAULT 0,
  UNIQUE(verse_id, drill_mode)
);

CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  reviews_completed INTEGER NOT NULL DEFAULT 0,
  new_cards_studied INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verses_veda ON verses(veda_id);
CREATE INDEX IF NOT EXISTS idx_verses_subdivision ON verses(subdivision_id);
CREATE INDEX IF NOT EXISTS idx_srs_next_review ON srs_cards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_srs_verse_mode ON srs_cards(verse_id, drill_mode);
CREATE INDEX IF NOT EXISTS idx_word_annotations_verse ON word_annotations(verse_id);
