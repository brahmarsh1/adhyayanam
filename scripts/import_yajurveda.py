#!/usr/bin/env python3
"""Import Krishna Yajurveda (Taittiriya Samhita) corpus into SQLite database."""

import os
import re
import sqlite3
from pathlib import Path
from baraha_to_devanagari import baraha_to_devanagari

CORPUS_ROOT = Path.home() / "brahmarsh1" / "sruti" / "yajurveda" / "krishna" / "taittiriya_samhita"
DB_PATH = Path(__file__).parent.parent / "adhyayanam.db"


def find_brh_file(kanda_dir: Path) -> Path | None:
    """Find the best BRH file for a kanda's samhita."""
    samhita_dir = kanda_dir / "samhita"
    if not samhita_dir.exists():
        return None

    kanda_num = kanda_dir.name.split("_")[1]

    # Prefer the Sanskrit.brh variant (more recent/normalized)
    for name in [
        f"TS {kanda_num} Sanskrit.brh",
        f"TS {kanda_num} Baraha.brh",
        f"TS {kanda_num} Baraha.BRH",
    ]:
        path = samhita_dir / name
        if path.exists():
            return path

    # Fallback: find any .brh file
    for f in samhita_dir.iterdir():
        if f.suffix.lower() == '.brh' and 'Baraha' in f.name:
            return f

    return None


def parse_brh_file(filepath: Path) -> list[dict]:
    """Parse a TS BRH file into structured verse data.

    Returns list of dicts with keys: kanda, prapathaka, anuvaka, mantra, baraha_text
    """
    content = filepath.read_text(encoding='utf-8', errors='replace')
    verses = []

    # Match TS K.P.A.M markers
    # Pattern: "TS K.P.A.M" at start of line (with optional whitespace)
    marker_pattern = re.compile(
        r'^\s*TS\s+(\d+)\.(\d+)\.(\d+)\.(\d+)\s*$',
        re.MULTILINE
    )

    markers = list(marker_pattern.finditer(content))

    for idx, match in enumerate(markers):
        kanda = int(match.group(1))
        prapathaka = int(match.group(2))
        anuvaka = int(match.group(3))
        mantra = int(match.group(4))

        # Extract text between this marker and the next (or end of file)
        start = match.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(content)
        raw_text = content[start:end].strip()

        # Clean up the text:
        # 1. Remove anuvaka summary lines: "(text) (AN)" at end of sections
        raw_text = re.sub(r'\([\s\S]*?\)\s*\(A\d+\)\s*$', '', raw_text).strip()
        # 2. Remove verse numbering at end: "|| N" or "| N" patterns
        raw_text = re.sub(r'\|\|\s*\d+\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\s*\d+\s*$', '', raw_text).strip()
        # 3. Remove [  ] section markers
        raw_text = re.sub(r'\[\s*\]', '', raw_text).strip()
        raw_text = re.sub(r'-\s*\[\s*\]', '', raw_text).strip()
        # 4. Collapse multiple spaces/newlines
        raw_text = re.sub(r'\s+', ' ', raw_text).strip()
        # 5. Remove trailing dash
        raw_text = raw_text.rstrip('-').strip()

        if raw_text:
            verses.append({
                'kanda': kanda,
                'prapathaka': prapathaka,
                'anuvaka': anuvaka,
                'mantra': mantra,
                'baraha_text': raw_text,
            })

    return verses


def import_yajurveda(db_path: Path = DB_PATH):
    """Main import function."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Create schema (idempotent)
    schema_path = Path(__file__).parent.parent / "src-tauri" / "migrations" / "001_initial_schema.sql"
    if schema_path.exists():
        conn.executescript(schema_path.read_text())

    # Insert Krishna Yajurveda
    conn.execute(
        "INSERT OR IGNORE INTO vedas (id, name, name_devanagari, name_display) VALUES (2, 'krishna_yajurveda', 'कृष्णयजुर्वेदः', 'Krishna Yajurveda (Taittiriya Samhita)')"
    )
    veda_id = 2

    total_verses = 0

    for kanda_num in range(1, 8):
        kanda_dir = CORPUS_ROOT / f"kanda_{kanda_num}"
        if not kanda_dir.exists():
            print(f"  Skipping kanda {kanda_num}: directory not found")
            continue

        brh_file = find_brh_file(kanda_dir)
        if not brh_file:
            print(f"  Skipping kanda {kanda_num}: no BRH file found")
            continue

        print(f"  Processing kanda {kanda_num}: {brh_file.name}")

        # Insert division (kanda)
        kanda_name = f"kanda_{kanda_num}"
        kanda_deva = f"काण्ड {kanda_num}"
        conn.execute(
            "INSERT OR IGNORE INTO divisions (veda_id, number, name, name_devanagari) VALUES (?, ?, ?, ?)",
            (veda_id, kanda_num, kanda_name, kanda_deva),
        )
        division_id = conn.execute(
            "SELECT id FROM divisions WHERE veda_id = ? AND number = ?",
            (veda_id, kanda_num),
        ).fetchone()[0]

        # Parse BRH file
        verses = parse_brh_file(brh_file)
        if not verses:
            print(f"    No verses found in {brh_file.name}")
            continue

        # Group by prapathaka for subdivisions
        prapathakas = {}
        for v in verses:
            pp = v['prapathaka']
            if pp not in prapathakas:
                prapathakas[pp] = []
            prapathakas[pp].append(v)

        for pp_num, pp_verses in sorted(prapathakas.items()):
            # Insert subdivision (prapathaka)
            pp_name = f"prapathaka_{pp_num}"
            conn.execute(
                "INSERT OR IGNORE INTO subdivisions (division_id, number, name) VALUES (?, ?, ?)",
                (division_id, pp_num, pp_name),
            )
            subdivision_id = conn.execute(
                "SELECT id FROM subdivisions WHERE division_id = ? AND number = ?",
                (division_id, pp_num),
            ).fetchone()[0]

            # Track anuvakas
            anuvaka_ids = {}

            for verse_data in pp_verses:
                anuvaka_num = verse_data['anuvaka']
                mantra_num = verse_data['mantra']
                baraha_text = verse_data['baraha_text']

                # Insert anuvaka if new
                if anuvaka_num not in anuvaka_ids:
                    conn.execute(
                        "INSERT OR IGNORE INTO anuvakas (subdivision_id, number) VALUES (?, ?)",
                        (subdivision_id, anuvaka_num),
                    )
                    row = conn.execute(
                        "SELECT id FROM anuvakas WHERE subdivision_id = ? AND number = ?",
                        (subdivision_id, anuvaka_num),
                    ).fetchone()
                    anuvaka_ids[anuvaka_num] = row[0]

                anuvaka_id = anuvaka_ids[anuvaka_num]

                # Convert Baraha to Devanagari
                try:
                    text_devanagari = baraha_to_devanagari(baraha_text)
                except Exception as e:
                    print(f"    Warning: conversion error for TS {kanda_num}.{pp_num}.{anuvaka_num}.{mantra_num}: {e}")
                    text_devanagari = baraha_text  # Fallback to raw text

                reference = f"TS {kanda_num}.{pp_num}.{anuvaka_num}.{mantra_num}"

                # Compute a linear verse number within the prapathaka
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
        print(f"    Kanda {kanda_num}: {len(verses)} mantras imported")

    conn.commit()
    conn.close()
    print(f"\nKrishna Yajurveda import complete: {total_verses} mantras")
    return total_verses


if __name__ == '__main__':
    print("Importing Krishna Yajurveda (Taittiriya Samhita)...")
    import_yajurveda()
