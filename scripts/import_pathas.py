#!/usr/bin/env python3
"""Import pada, krama, jata, and ghana patha for Krishna Yajurveda into existing DB.

Updates existing verse rows with patha text from BRH files.
Each patha file is organized by prapathaka, with verse markers like:
  - Pada:  "TS K.P.A.M" header, pipe-separated words
  - Krama: "T.S.K.P.A.M - kramam" header, word-pair sequences
  - Ghana: Numbered entries "N) K.P.A.M(pos)- words | (ref)"
  - Jata:  Same format as ghana but 2-word patterns
"""

import os
import re
import sqlite3
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from baraha_to_devanagari import baraha_to_devanagari

CORPUS_ROOT = Path.home() / "brahmarsh1" / "sruti" / "yajurveda" / "krishna" / "taittiriya_samhita"
DB_PATH = Path(__file__).parent.parent / "adhyayanam.db"


def find_brh_files(kanda_dir: Path, patha_type: str, prapathaka_num: int) -> Path | None:
    """Find the Sanskrit BRH file for a given patha type and prapathaka."""
    kanda_num = kanda_dir.name.split("_")[1]

    if patha_type == "jata":
        # Jata files are inside ghana directory
        base_dir = kanda_dir / "ghana" / f"prapathaka_{prapathaka_num}"
    else:
        base_dir = kanda_dir / patha_type / f"prapathaka_{prapathaka_num}"

    if not base_dir.exists():
        return None

    # Build candidate file names
    prefix = f"TS {kanda_num}.{prapathaka_num}"
    if patha_type == "pada":
        candidates = [
            f"{prefix} Sanskrit Padam.BRH",
            f"{prefix} Sanskrit Padam.brh",
            f"{prefix} Padam Sanskrit.BRH",
            f"{prefix} Padam Sanskrit.brh",
        ]
    elif patha_type == "krama":
        candidates = [
            f"{prefix} Krama Paaatm Sanskrit.BRH",
            f"{prefix} Krama Paaatm Sanskrit.brh",
            f"{prefix} Krama Sanskrit.BRH",
            f"{prefix} Krama Sanskrit.brh",
            f"{prefix} Sanskrit Krama.BRH",
        ]
    elif patha_type == "ghana":
        candidates = [
            f"{prefix} Ghanam Sanskrit.BRH",
            f"{prefix} Ghanam Sanskrit.brh",
            f"{prefix} Ghana Sanskrit.BRH",
            f"{prefix} Ghana Sanskrit.brh",
        ]
    elif patha_type == "jata":
        candidates = [
            f"{prefix} Jatai Sanskrit.BRH",
            f"{prefix} Jatai Sanskrit.brh",
            f"{prefix} Jata Sanskrit.BRH",
            f"{prefix} Jata Sanskrit.brh",
        ]
    else:
        return None

    for name in candidates:
        path = base_dir / name
        if path.exists():
            return path

    # Fallback: find any Sanskrit BRH in the directory
    for f in base_dir.iterdir():
        if f.suffix.lower() == '.brh' and 'Sanskrit' in f.name:
            if patha_type == "jata" and 'Jata' in f.name:
                return f
            elif patha_type == "ghana" and 'Ghana' in f.name:
                return f
            elif patha_type == "pada" and 'Padam' in f.name:
                return f
            elif patha_type == "krama" and 'Krama' in f.name:
                return f

    return None


def parse_pada_file(filepath: Path) -> dict[str, str]:
    """Parse pada patha BRH file. Returns {reference: baraha_text}."""
    content = filepath.read_text(encoding='utf-8', errors='replace')
    result = {}

    # Match "TS K.P.A.M" or "TS K.P.A.M - Padam" markers
    marker_pattern = re.compile(r'^\s*TS\s+(\d+\.\d+\.\d+\.\d+)(?:\s*-\s*Padam)?\s*$', re.MULTILINE)
    markers = list(marker_pattern.finditer(content))

    for idx, match in enumerate(markers):
        ref = f"TS {match.group(1)}"
        start = match.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(content)
        raw_text = content[start:end].strip()

        # Clean: remove anuvaka summaries, verse counts, section markers
        raw_text = re.sub(r'\([\w\s\u0900-\u097F#q,\-]+\)\s*\(A\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\|\s*\d+\s*\(\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\d+\s*\(\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\[\s*\]', '', raw_text).strip()
        raw_text = re.sub(r'-\s*\[\s*\]', '', raw_text).strip()
        raw_text = re.sub(r'\s+', ' ', raw_text).strip()
        raw_text = raw_text.rstrip('-').strip()

        if raw_text:
            result[ref] = raw_text

    return result


def parse_krama_file(filepath: Path) -> dict[str, str]:
    """Parse krama patha BRH file. Returns {reference: baraha_text}."""
    content = filepath.read_text(encoding='utf-8', errors='replace')
    result = {}

    # Match "T.S.K.P.A.M - kramam" markers
    marker_pattern = re.compile(
        r'^\s*T\.S\.(\d+\.\d+\.\d+\.\d+)\s*-\s*kramam\s*$',
        re.MULTILINE
    )
    markers = list(marker_pattern.finditer(content))

    for idx, match in enumerate(markers):
        ref = f"TS {match.group(1)}"
        start = match.end()
        end = markers[idx + 1].start() if idx + 1 < len(markers) else len(content)
        raw_text = content[start:end].strip()

        # Clean up
        raw_text = re.sub(r'\([\w\s\u0900-\u097F#q,\-]+\)\s*\(A\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\|\|\s*\d+\s*\(\d+/\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\d+\s*\(\d+/\d+\)\s*$', '', raw_text).strip()
        raw_text = re.sub(r'\[\s*\]', '', raw_text).strip()
        raw_text = re.sub(r'\s+', ' ', raw_text).strip()
        raw_text = raw_text.rstrip('-').strip()

        if raw_text:
            result[ref] = raw_text

    return result


def parse_ghana_or_jata_file(filepath: Path) -> dict[str, str]:
    """Parse ghana or jata patha BRH file.

    These files have numbered entries like:
      1) 1.1.1.1(1)- text | text | (GS1.1-1)
      text text text |

    We group consecutive entries by their TS reference (K.P.A.M) and concatenate.
    Returns {reference: baraha_text}.
    """
    content = filepath.read_text(encoding='utf-8', errors='replace')
    result = {}

    # Match numbered entry headers: "N) K.P.A.M(pos)- words"
    # or "N)\tK.P.A.M(pos)- words"
    entry_pattern = re.compile(
        r'^\s*\d+\)\s+(\d+\.\d+\.\d+\.\d+)\((\d+)\)\s*-\s*(.+?)$',
        re.MULTILINE
    )

    entries = list(entry_pattern.finditer(content))
    if not entries:
        return result

    # Group entries by verse reference and collect their full text
    current_ref = None
    current_texts = []

    for idx, match in enumerate(entries):
        ref = f"TS {match.group(1)}"
        header_line = match.group(3).strip()

        # Get the text after the header line until the next entry
        start = match.end()
        end = entries[idx + 1].start() if idx + 1 < len(entries) else len(content)
        body = content[start:end].strip()

        # The full entry text is the header line content + body
        # Remove reference codes like (GS1.1-1) and clean up
        full_text = header_line
        if body:
            # Body is the continuation (the actual patha text)
            full_text = body

        # Clean
        full_text = re.sub(r'\(GS[\d\.\-]+\)', '', full_text).strip()
        full_text = re.sub(r'\(A\d+\)', '', full_text).strip()
        full_text = re.sub(r'\s+', ' ', full_text).strip()

        if ref != current_ref:
            if current_ref and current_texts:
                result[current_ref] = '\n'.join(current_texts)
            current_ref = ref
            current_texts = []

        if full_text:
            current_texts.append(full_text)

    # Don't forget the last group
    if current_ref and current_texts:
        result[current_ref] = '\n'.join(current_texts)

    return result


def update_verse_patha(conn: sqlite3.Connection, reference: str, column_baraha: str, column_deva: str, baraha_text: str):
    """Update a verse row with patha text (both baraha and devanagari)."""
    try:
        deva_text = baraha_to_devanagari(baraha_text)
    except Exception:
        deva_text = baraha_text  # Fallback

    conn.execute(
        f"UPDATE verses SET {column_baraha} = ?, {column_deva} = ? WHERE reference = ?",
        (baraha_text, deva_text, reference),
    )


def import_pathas(db_path: Path = DB_PATH):
    """Import all patha formats for all kandas."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")

    # Add columns if they don't exist (migration)
    for col in ['kramapatha_devanagari', 'kramapatha_baraha',
                'jatapatha_devanagari', 'jatapatha_baraha',
                'ghanapatha_devanagari', 'ghanapatha_baraha']:
        try:
            conn.execute(f"ALTER TABLE verses ADD COLUMN {col} TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

    patha_configs = [
        ("pada", "padapatha_baraha", "padapatha_devanagari", parse_pada_file),
        ("krama", "kramapatha_baraha", "kramapatha_devanagari", parse_krama_file),
        ("ghana", "ghanapatha_baraha", "ghanapatha_devanagari", parse_ghana_or_jata_file),
        ("jata", "jatapatha_baraha", "jatapatha_devanagari", parse_ghana_or_jata_file),
    ]

    total_updates = {p[0]: 0 for p in patha_configs}

    for kanda_num in range(1, 8):
        kanda_dir = CORPUS_ROOT / f"kanda_{kanda_num}"
        if not kanda_dir.exists():
            continue

        print(f"  Kanda {kanda_num}:")

        for prapathaka_num in range(1, 9):
            for patha_type, col_baraha, col_deva, parser_fn in patha_configs:
                brh_file = find_brh_files(kanda_dir, patha_type, prapathaka_num)
                if not brh_file:
                    continue

                verses = parser_fn(brh_file)
                if not verses:
                    continue

                count = 0
                for ref, baraha_text in verses.items():
                    update_verse_patha(conn, ref, col_baraha, col_deva, baraha_text)
                    count += 1

                total_updates[patha_type] += count

            conn.commit()

    conn.commit()
    conn.close()

    print(f"\nPatha import complete:")
    for patha_type, count in total_updates.items():
        print(f"  {patha_type}: {count} verses updated")


if __name__ == '__main__':
    print("Importing pada, krama, jata, and ghana patha...")
    import_pathas()
