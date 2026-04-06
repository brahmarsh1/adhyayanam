#!/usr/bin/env python3
"""Import Taittiriya Brahmana corpus into SQLite database."""

import re
import sqlite3
from pathlib import Path
from baraha_to_devanagari import baraha_to_devanagari

CORPUS_ROOT = Path.home() / "brahmarsh1" / "sruti" / "yajurveda" / "krishna" / "brahmana"
DB_PATH = Path(__file__).parent.parent / "adhyayanam.db"

# Sanskrit BRH files covering all 3 ashtakas
BRH_FILES = [
    "TB 1.1-1.4 Sanskrit.BRH",
    "TB 1.5-1.8 Sanskrit.BRH",
    "TB 2.1-2.4 Sanskrit.brh",
    "TB 2.5-2.8 Sanskrit.brh",
    "TB 3.1-3.6 Sanskrit.brh",
    "TB 3.7 to 3.12 Sanskrit.BRH",
]


def parse_brh_file(filepath: Path) -> list[dict]:
    """Parse a TB BRH file into structured verse data.

    Handles both 'TB A.P.An.V' and 'T.B.A.P.An.V' marker formats.
    Returns list of dicts with keys: ashtaka, prapathaka, anuvaka, mantra, baraha_text
    """
    content = filepath.read_text(encoding='utf-8', errors='replace')
    verses = []

    # Match both formats: "TB 1.1.1.1" and "T.B.1.1.1.1"
    marker_pattern = re.compile(
        r'^\s*(?:TB\s+|T\.B\.)(\d+)\.(\d+)\.(\d+)\.(\d+)\s*(?:\(.*?\))?\s*$',
        re.MULTILINE
    )

    markers = list(marker_pattern.finditer(content))

    for idx, match in enumerate(markers):
        ashtaka = int(match.group(1))
        prapathaka = int(match.group(2))
        anuvaka = int(match.group(3))
        mantra = int(match.group(4))

        start = match.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(content)
        raw_text = content[start:end].strip()

        # Clean up:
        # Remove anuvaka summary lines: "(text) (AN)"
        raw_text = re.sub(r'\([\s\S]*?\)\s*\(A\d+\)\s*$', '', raw_text).strip()
        # Remove Special Korvai sections
        raw_text = re.sub(r'\(Special Korvai[\s\S]*?\)\s*$', '', raw_text).strip()
        # Remove verse numbering: "|| N (count)" or "| N (count)"
        raw_text = re.sub(r'\|\|\s*\d+\s*\(\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\|\s*\d+\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\s*\d+\s*\(\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\s*\d+\s*$', '', raw_text).strip()
        # Remove section markers and anuvaka headers that may appear at end
        raw_text = re.sub(r'\n\d+\.\d+\.\d+\s+anuvAkaM.*$', '', raw_text).strip()
        raw_text = re.sub(r'\n\d+\.\d+\s+.*prapAThakaH.*$', '', raw_text).strip()
        raw_text = re.sub(r'\n\d+\s+.*AShTakaM.*$', '', raw_text).strip()
        # Collapse whitespace
        raw_text = re.sub(r'\s+', ' ', raw_text).strip()
        # Remove trailing dash
        raw_text = raw_text.rstrip('-').strip()

        if raw_text:
            verses.append({
                'ashtaka': ashtaka,
                'prapathaka': prapathaka,
                'anuvaka': anuvaka,
                'mantra': mantra,
                'baraha_text': raw_text,
            })

    return verses


def import_brahmana(db_path: Path = DB_PATH):
    """Main import function."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Create schema (idempotent)
    schema_path = Path(__file__).parent.parent / "src-tauri" / "migrations" / "001_initial_schema.sql"
    if schema_path.exists():
        conn.executescript(schema_path.read_text())

    # Insert Taittiriya Brahmana
    conn.execute(
        "INSERT OR IGNORE INTO vedas (id, name, name_devanagari, name_display) "
        "VALUES (3, 'taittiriya_brahmana', 'तैत्तिरीयब्राह्मणम्', 'Taittiriya Brahmana')"
    )
    veda_id = 3

    total_verses = 0

    for brh_name in BRH_FILES:
        brh_path = CORPUS_ROOT / brh_name
        if not brh_path.exists():
            print(f"  Skipping: {brh_name} not found")
            continue

        print(f"  Processing: {brh_name}")
        verses = parse_brh_file(brh_path)
        if not verses:
            print(f"    No verses found")
            continue

        # Group by ashtaka (division) then prapathaka (subdivision)
        for v in verses:
            ashtaka_num = v['ashtaka']
            pp_num = v['prapathaka']
            anuvaka_num = v['anuvaka']
            mantra_num = v['mantra']
            baraha_text = v['baraha_text']

            # Insert division (ashtaka) if needed
            ashtaka_name = f"ashtaka_{ashtaka_num}"
            ashtaka_deva = f"अष्टक {ashtaka_num}"
            conn.execute(
                "INSERT OR IGNORE INTO divisions (veda_id, number, name, name_devanagari) VALUES (?, ?, ?, ?)",
                (veda_id, ashtaka_num, ashtaka_name, ashtaka_deva),
            )
            division_id = conn.execute(
                "SELECT id FROM divisions WHERE veda_id = ? AND number = ?",
                (veda_id, ashtaka_num),
            ).fetchone()[0]

            # Insert subdivision (prapathaka) if needed
            pp_name = f"prapathaka_{pp_num}"
            conn.execute(
                "INSERT OR IGNORE INTO subdivisions (division_id, number, name) VALUES (?, ?, ?)",
                (division_id, pp_num, pp_name),
            )
            subdivision_id = conn.execute(
                "SELECT id FROM subdivisions WHERE division_id = ? AND number = ?",
                (division_id, pp_num),
            ).fetchone()[0]

            # Insert anuvaka if needed
            conn.execute(
                "INSERT OR IGNORE INTO anuvakas (subdivision_id, number) VALUES (?, ?)",
                (subdivision_id, anuvaka_num),
            )
            anuvaka_id = conn.execute(
                "SELECT id FROM anuvakas WHERE subdivision_id = ? AND number = ?",
                (subdivision_id, anuvaka_num),
            ).fetchone()[0]

            # Convert Baraha to Devanagari
            try:
                text_devanagari = baraha_to_devanagari(baraha_text)
            except Exception as e:
                print(f"    Warning: conversion error for TB {ashtaka_num}.{pp_num}.{anuvaka_num}.{mantra_num}: {e}")
                text_devanagari = baraha_text

            reference = f"TB {ashtaka_num}.{pp_num}.{anuvaka_num}.{mantra_num}"
            verse_number = (anuvaka_num - 1) * 100 + mantra_num

            conn.execute(
                """INSERT OR IGNORE INTO verses
                   (veda_id, subdivision_id, anuvaka_id, verse_number, reference,
                    text_devanagari, text_baraha)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (veda_id, subdivision_id, anuvaka_id, verse_number, reference,
                 text_devanagari, baraha_text),
            )
            total_verses += 1

        conn.commit()
        print(f"    {len(verses)} mantras imported from {brh_name}")

    conn.commit()
    conn.close()
    print(f"\nTaittiriya Brahmana import complete: {total_verses} mantras")
    return total_verses


if __name__ == '__main__':
    print("Importing Taittiriya Brahmana...")
    import_brahmana()
