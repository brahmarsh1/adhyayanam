#!/usr/bin/env python3
"""Import Taittiriya Aranyaka corpus into SQLite database."""

import re
import sqlite3
from pathlib import Path
from baraha_to_devanagari import baraha_to_devanagari

CORPUS_ROOT = Path.home() / "brahmarsh1" / "sruti" / "yajurveda" / "krishna" / "aranyaka"
DB_PATH = Path(__file__).parent.parent / "adhyayanam.db"

# Sanskrit BRH files covering all 8 prapathakas
# TA 1-4 covers prapathakas 1-4, TA 5-6 covers 5-6, TA 7-8 covers 7-8
BRH_FILES = [
    "TA 1-4 Sanskrit.BRH",
    "TA 5-6 Sanskrit.brh",
    "TA 7-8 Sanskrit.BRH",
]


def parse_brh_file(filepath: Path) -> list[dict]:
    """Parse a TA BRH file into structured verse data.

    Marker format: T.A.P.An.V (prapathaka.anuvaka.verse)
    Returns list of dicts with keys: prapathaka, anuvaka, mantra, baraha_text
    """
    content = filepath.read_text(encoding='utf-8', errors='replace')
    verses = []

    # Match "T.A.P.An.V" markers, optionally with "(page N)" suffix
    marker_pattern = re.compile(
        r'^\s*T\.A\.(\d+)\.(\d+)\.(\d+)\s*(?:\(.*?\))?\s*$',
        re.MULTILINE
    )

    markers = list(marker_pattern.finditer(content))

    for idx, match in enumerate(markers):
        prapathaka = int(match.group(1))
        anuvaka = int(match.group(2))
        mantra = int(match.group(3))

        start = match.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(content)
        raw_text = content[start:end].strip()

        # Clean up:
        # Remove anuvaka summary lines: "(text) (AN)"
        raw_text = re.sub(r'\([\s\S]*?\)\s*\(A\d+\)\s*$', '', raw_text).strip()
        # Remove verse numbering: "|| N (count)" or "| N (count)"
        raw_text = re.sub(r'\|\|\s*\d+\s*\(\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\|\s*\d+\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\s*\d+\s*\(\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\s*\d+\s*$', '', raw_text).strip()
        # Remove section markers that may appear at end
        raw_text = re.sub(r'\n\d+\.\d+\.\d+\s+anuvAkaM.*$', '', raw_text).strip()
        raw_text = re.sub(r'\n\d+\.\d+\s+.*prapAThakaH.*$', '', raw_text).strip()
        raw_text = re.sub(r'\n\d+\s+.*prapAThakaH.*$', '', raw_text).strip()
        # Collapse whitespace
        raw_text = re.sub(r'\s+', ' ', raw_text).strip()
        # Remove trailing dash
        raw_text = raw_text.rstrip('-').strip()

        if raw_text:
            verses.append({
                'prapathaka': prapathaka,
                'anuvaka': anuvaka,
                'mantra': mantra,
                'baraha_text': raw_text,
            })

    return verses


def import_aranyaka(db_path: Path = DB_PATH):
    """Main import function."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Create schema (idempotent)
    schema_path = Path(__file__).parent.parent / "src-tauri" / "migrations" / "001_initial_schema.sql"
    if schema_path.exists():
        conn.executescript(schema_path.read_text())

    # Insert Taittiriya Aranyaka
    conn.execute(
        "INSERT OR IGNORE INTO vedas (id, name, name_devanagari, name_display) "
        "VALUES (4, 'taittiriya_aranyaka', 'तैत्तिरीयारण्यकम्', 'Taittiriya Aranyaka')"
    )
    veda_id = 4

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

        for v in verses:
            pp_num = v['prapathaka']
            anuvaka_num = v['anuvaka']
            mantra_num = v['mantra']
            baraha_text = v['baraha_text']

            # Insert division (prapathaka) — Aranyaka is organized by prapathaka at top level
            pp_name = f"prapathaka_{pp_num}"
            pp_deva = f"प्रपाठक {pp_num}"
            conn.execute(
                "INSERT OR IGNORE INTO divisions (veda_id, number, name, name_devanagari) VALUES (?, ?, ?, ?)",
                (veda_id, pp_num, pp_name, pp_deva),
            )
            division_id = conn.execute(
                "SELECT id FROM divisions WHERE veda_id = ? AND number = ?",
                (veda_id, pp_num),
            ).fetchone()[0]

            # Insert subdivision (anuvaka)
            an_name = f"anuvaka_{anuvaka_num}"
            conn.execute(
                "INSERT OR IGNORE INTO subdivisions (division_id, number, name) VALUES (?, ?, ?)",
                (division_id, anuvaka_num, an_name),
            )
            subdivision_id = conn.execute(
                "SELECT id FROM subdivisions WHERE division_id = ? AND number = ?",
                (division_id, anuvaka_num),
            ).fetchone()[0]

            # Convert Baraha to Devanagari
            try:
                text_devanagari = baraha_to_devanagari(baraha_text)
            except Exception as e:
                print(f"    Warning: conversion error for TA {pp_num}.{anuvaka_num}.{mantra_num}: {e}")
                text_devanagari = baraha_text

            reference = f"TA {pp_num}.{anuvaka_num}.{mantra_num}"
            verse_number = mantra_num

            conn.execute(
                """INSERT OR IGNORE INTO verses
                   (veda_id, subdivision_id, verse_number, reference,
                    text_devanagari, text_baraha)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (veda_id, subdivision_id, verse_number, reference,
                 text_devanagari, baraha_text),
            )
            total_verses += 1

        conn.commit()
        print(f"    {len(verses)} mantras imported from {brh_name}")

    conn.commit()
    conn.close()
    print(f"\nTaittiriya Aranyaka import complete: {total_verses} mantras")
    return total_verses


if __name__ == '__main__':
    print("Importing Taittiriya Aranyaka...")
    import_aranyaka()
