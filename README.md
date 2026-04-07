# अध्ययनम् — Adhyayanam

A desktop application for students of the Vedas, designed to support systematic study and memorization of Vedic texts through spaced repetition.

Adhyayanam (अध्ययनम्) means "study" or "learning" in Sanskrit. The app brings together a browsable corpus of Vedic literature with an intelligent review system that adapts to each student's pace.

## Why Adhyayanam?

Traditional Vedic study (adhyayanam) follows a time-tested method: the student learns verses from the guru, recites them repeatedly, and reviews them at increasing intervals until they are committed to long-term memory. This app digitizes that process while preserving the structure and integrity of the texts.

The Vedic corpus is vast. A student of the Krishna Yajurveda alone encounters thousands of mantras across the Samhita, Brahmana, and Aranyaka. Each mantra exists in multiple recitation forms — samhitapatha, padapatha, kramapatha, jatapatha, and ghanapatha — each serving a different pedagogical purpose. Adhyayanam makes this entire corpus navigable and organizes study around proven memory science.

## Corpus

The app currently supports four major texts of the Vedic canon:

| Text | Mantras | Description |
|------|---------|-------------|
| **Rigveda** | 10,255 | The oldest Vedic text, organized by mandala and sukta |
| **Taittiriya Samhita** | 2,196 | The mantra portion of the Krishna Yajurveda, organized by kanda and prapathaka |
| **Taittiriya Brahmana** | 1,759 | Ritual commentary and additional mantras, organized by ashtaka and prapathaka |
| **Taittiriya Aranyaka** | 556 | Forest texts including the Mahanarayana Upanishad, organized by prapathaka |

Each verse is stored in both Devanagari and Baraha transliteration. Where available, the following patha (recitation) variants are included:

- **Samhitapatha** — the continuous recitation form with sandhi
- **Padapatha** — word-by-word separation, revealing the underlying morphology
- **Kramapatha** — sequential word-pair recitation (word 1-2, 2-3, 3-4...)
- **Jatapatha** — interlocked forward-backward recitation pattern
- **Ghanapatha** — the most complex recitation pattern, ensuring absolute fidelity of transmission

Verse metadata includes the traditional attributions: rishi (seer), devata (presiding deity), and chandas (meter).

## Study System

### Spaced Repetition (SM-2)

Adhyayanam uses the SM-2 algorithm — the same system behind Anki and SuperMemo — adapted for Vedic study. After reviewing a verse, you rate your recall:

| Rating | Meaning | Effect |
|--------|---------|--------|
| **Again** | Could not recall | Reset to 1-day interval |
| **Hard** | Recalled with difficulty | Shorter next interval |
| **Good** | Recalled correctly | Standard interval growth |
| **Easy** | Recalled effortlessly | Longer next interval |

The algorithm adjusts the ease factor and review interval for each card individually. Cards progress from "learning" (short intervals) to "mature" (21+ day intervals) as mastery deepens.

### Three Study Modes

Each verse can generate cards in three complementary drill modes:

#### Recitation

The app shows the first pada (quarter-verse) and asks you to recite the rest. This mirrors the traditional method where the guru gives the opening and the student completes the verse from memory. The full verse is revealed for self-assessment.

#### Fill in the Blank

Two content words are removed from the verse. You type them in. The app prefers longer, more meaningful words and validates answers loosely, ignoring accent marks and whitespace differences. This strengthens word-level recall within the flow of the mantra.

#### Metadata Quiz

A multiple-choice question asks you to identify the rishi, devata, or chandas of a verse. Knowing these attributions is an essential part of Vedic study — the Anukramani (index) tradition places great importance on understanding who saw each mantra, which deity it addresses, and what meter it employs.

### Keyboard Shortcuts

The study interface is designed for flow. You can complete an entire review session without touching the mouse:

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Reveal answer |
| `1` `2` `3` `4` | Grade card (Again / Hard / Good / Easy) |
| `1` `2` `3` `4` | Select quiz answer |

## IAST Display with Svara Markings

The app converts Baraha transliteration to proper IAST (International Alphabet of Sanskrit Transliteration) with Vedic accent markings:

- **Svarita** (स्वरित) — rendered in **bold amber** with a top border, making the falling-pitch syllables immediately visible
- **Anudatta** (अनुदात्त) — rendered with an underline, marking low-pitch syllables
- **Udatta** (उदात्त) — unmarked, representing the default high pitch

The display uses a serif font (Gentium Plus or similar) for clean, readable romanized Sanskrit. You can switch between Devanagari only, IAST only, or both in Settings.

## Architecture

### Monorepo Structure

Adhyayanam is a monorepo using npm workspaces. All UI code is written once and shared across all platforms. Each platform has a thin shell that bootstraps the right database adapter.

```
adhyayanam/
├── packages/
│   ├── shared/          # Types, SRS algorithm, IAST converter, DbAdapter interface
│   └── db-adapters/     # TauriAdapter (desktop) + WasmAdapter (web/mobile)
├── apps/
│   ├── ui/              # All React components, stores, styles (shared)
│   ├── desktop/         # Tauri shell — uses Rust + native SQLite
│   ├── web/             # Web shell — uses sql.js (SQLite in WASM)
│   └── mobile/          # Capacitor shell — reuses WasmAdapter
└── scripts/             # Python corpus import scripts
```

### How It Works

Components never call platform APIs directly. Instead, they use a `DbAdapter` interface via React context:

```typescript
const db = useDb();
const vedas = await db.getVedas();
```

On desktop, `useDb()` returns a `TauriAdapter` that calls Rust via `invoke()`. On web and mobile, it returns a `WasmAdapter` that runs SQLite queries in-browser using sql.js. The components don't know or care which one they're using.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **UI** | React 19 + TypeScript + Tailwind CSS |
| **State** | Zustand |
| **Desktop backend** | Rust + rusqlite (via Tauri 2) |
| **Web/mobile backend** | sql.js (SQLite compiled to WASM) |
| **Mobile wrapper** | Capacitor 6 (iOS + Android) |
| **Build** | Vite 8 |

### Database

SQLite with WAL mode. The schema supports the full hierarchy of Vedic texts:

```
vedas → divisions → subdivisions → verses
                                  → word_annotations
                                  → srs_cards
```

The database file (~60MB) is not checked into git. For desktop, it lives in the app data directory. For web, it's fetched on first load and cached in IndexedDB. For mobile, it's bundled as an asset.

### Import Scripts

Python scripts in `scripts/` parse Baraha `.brh` files from the source corpus and populate the database:

| Script | Source |
|--------|--------|
| `import_rigveda.py` | Rigveda mandala files |
| `import_yajurveda.py` | Taittiriya Samhita kanda files |
| `import_brahmana.py` | Taittiriya Brahmana BRH files |
| `import_aranyaka.py` | Taittiriya Aranyaka BRH files |
| `import_pathas.py` | Pada, krama, jata, ghana patha variants |
| `baraha_to_devanagari.py` | Baraha → Devanagari converter used by all importers |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (desktop only)
- Python 3.10+ (for import scripts)
- Xcode (iOS) or Android Studio (mobile only)

### Setup

```bash
# Install all workspace dependencies
npm install

# Generate the database (requires source corpus in ~/brahmarsh1/sruti/)
cd scripts
python3 import_rigveda.py
python3 import_yajurveda.py
python3 import_brahmana.py
python3 import_aranyaka.py
python3 import_pathas.py
cd ..
```

### Development

```bash
# Desktop (Tauri)
npm run dev:desktop

# Web (browser)
npm run dev:web

# Mobile (Capacitor)
npm run dev:mobile
```

### Production Builds

```bash
# Build all platforms
npm run build:all

# Or individually
npm run build:desktop   # → .app / .msi / .deb
npm run build:web       # → apps/web/dist/
npm run build:mobile    # → apps/mobile/dist/ (then cap sync)
```

### Mobile Deployment

```bash
# iOS
cd apps/mobile
npm run cap:ios         # Opens Xcode

# Android
npm run cap:android     # Opens Android Studio
```

### Configuration

Settings are accessible from the sidebar:

- **New cards per day** — how many unseen verses to introduce daily
- **Max reviews per day** — cap on total reviews per session
- **Display script** — Devanagari, IAST, or both
- **Font size** — adjustable for comfortable reading of Sanskrit text
- **Drill modes** — enable/disable recitation, fill-in-blank, and metadata drills

## License

This project is for personal and educational use in the study of Vedic literature.
