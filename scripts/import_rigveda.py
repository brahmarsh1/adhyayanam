#!/usr/bin/env python3
"""Import Rigveda corpus into SQLite database."""

import json
import os
import re
import sqlite3
import csv
from pathlib import Path

CORPUS_ROOT = Path.home() / "brahmarsh1" / "sruti" / "rigveda"
DB_PATH = Path(__file__).parent.parent / "adhyayanam.db"

# Devanagari digit map
DEVA_DIGITS = {chr(0x0966 + i): str(i) for i in range(10)}


def deva_to_int(s: str) -> int:
    """Convert Devanagari numeral string to int."""
    ascii_str = "".join(DEVA_DIGITS.get(c, c) for c in s.strip())
    try:
        return int(ascii_str)
    except ValueError:
        return 0


def parse_metadata_line(line: str):
    """Parse the first line of a sukta JSON text field.

    Format: "{index} {rishi}। {devata}। {chandas}।"
    or:     "{index} {rishi}. {devata}. {chandas}."
    Devata may have ranges: "1-3 वायुः, 4-6 इन्द्र-वायु, 7-9 मित्रा-वरुणौ"
    """
    line = line.strip()
    # Remove leading index number (Devanagari or ASCII)
    m = re.match(r'^[\d\u0966-\u096F]+\s+', line)
    if m:
        line = line[m.end():]

    # Split on '।' or '.' -- expect: rishi, devata, chandas
    parts = re.split(r'[।.]\s*', line)
    parts = [p.strip() for p in parts if p.strip()]

    rishi = parts[0] if len(parts) > 0 else None
    devata_raw = parts[1] if len(parts) > 1 else None
    chandas = parts[2] if len(parts) > 2 else None

    return rishi, devata_raw, chandas


def parse_devata_ranges(devata_raw: str):
    """Parse devata string that may have verse ranges.

    Examples:
      "अग्निः" -> {None: "अग्निः"}
      "1-3 वायुः, 4-6 इन्द्र-वायु" -> {1: "वायुः", 2: "वायुः", 3: "वायुः", 4: "इन्द्र-वायु", ...}
    """
    if not devata_raw:
        return {}

    # Check if it has range patterns (Devanagari or ASCII digits followed by devata)
    range_pattern = re.compile(r'([\d\u0966-\u096F]+)\s*[-–]\s*([\d\u0966-\u096F]+)\s+(.+?)(?:,|$)')
    matches = list(range_pattern.finditer(devata_raw))

    if not matches:
        return {0: devata_raw.strip()}

    result = {}
    for m in matches:
        start = deva_to_int(m.group(1))
        end = deva_to_int(m.group(2))
        devata = m.group(3).strip().rstrip(',').strip()
        for v in range(start, end + 1):
            result[v] = devata

    return result


def parse_verses(text: str):
    """Split text into individual verses on ॥N॥ markers."""
    # Split on double danda + number
    parts = re.split(r'॥\s*[\d\u0966-\u096F]+\s*॥', text)
    verses = []
    for p in parts:
        p = p.strip()
        if p:
            verses.append(p)
    return verses


def parse_baraha_md(filepath: Path):
    """Parse .baraha.md file to extract per-verse samhita and padapatha."""
    if not filepath.exists():
        return {}

    content = filepath.read_text(encoding='utf-8')
    result = {}
    current_key = None
    current_samhita = None
    current_padapatha = None

    for line in content.split('\n'):
        line = line.strip()
        # Match ### M.S.V headers
        m = re.match(r'^###\s+(\d+\.\d+\.\d+)', line)
        if m:
            if current_key and current_samhita:
                result[current_key] = {
                    'samhita': current_samhita,
                    'padapatha': current_padapatha,
                }
            current_key = m.group(1)
            current_samhita = None
            current_padapatha = None
            continue

        if line.startswith('**samhita:**'):
            current_samhita = line.replace('**samhita:**', '').strip()
        elif line.startswith('**padapatha:**'):
            current_padapatha = line.replace('**padapatha:**', '').strip()

    # Don't forget the last entry
    if current_key and current_samhita:
        result[current_key] = {
            'samhita': current_samhita,
            'padapatha': current_padapatha,
        }

    return result


def parse_annotated_csv(filepath: Path):
    """Parse $-delimited annotated CSV, group by (strophe, verse) = verse_number."""
    if not filepath.exists():
        return {}

    result = {}  # verse_number -> [annotations]

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='$')
        header = next(reader, None)
        if not header:
            return {}

        # Find column indices
        cols = {name: i for i, name in enumerate(header)}
        strophe_idx = cols.get('strophe', 2)
        verse_idx = cols.get('verse', 3)
        position_idx = cols.get('position', 4)
        word_idx = cols.get('word', 7)
        lemma_idx = cols.get('lemma', 8)
        verbal_root_idx = cols.get('verbal_root', 9)
        pos_idx = cols.get('udpos', 14)
        case_idx = cols.get('cas', 15)
        num_idx = cols.get('num', 16)
        gen_idx = cols.get('gen', 17)

        for row in reader:
            if len(row) <= max(strophe_idx, verse_idx, position_idx, word_idx):
                continue

            try:
                strophe = int(row[strophe_idx])
                verse_num = int(row[verse_idx])
                # Compute global verse number: (strophe-1)*verses_per_strophe + verse
                # Actually, the verse numbering in RV is linear per sukta
                # strophe = rik number, verse = line within rik
                # We want the rik number (strophe)
                key = strophe

                position = int(row[position_idx])
                word = row[word_idx] if word_idx < len(row) else ''
                lemma = row[lemma_idx] if lemma_idx < len(row) else None
                verbal_root = row[verbal_root_idx] if verbal_root_idx < len(row) else None
                pos = row[pos_idx] if pos_idx < len(row) else None
                case_num = int(row[case_idx]) if case_idx < len(row) and row[case_idx].isdigit() else None
                num_num = int(row[num_idx]) if num_idx < len(row) and row[num_idx].isdigit() else None
                gen_num = int(row[gen_idx]) if gen_idx < len(row) and row[gen_idx].isdigit() else None

                if key not in result:
                    result[key] = []

                result[key].append({
                    'position': position,
                    'word': word,
                    'lemma': lemma if lemma else None,
                    'verbal_root': verbal_root if verbal_root else None,
                    'pos': pos if pos and pos != '_' else None,
                    'case_num': case_num,
                    'number_num': num_num,
                    'gender_num': gen_num,
                })
            except (ValueError, IndexError):
                continue

    return result


def import_rigveda(db_path: Path = DB_PATH):
    """Main import function."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    # Create schema
    schema_path = Path(__file__).parent.parent / "src-tauri" / "migrations" / "001_initial_schema.sql"
    if schema_path.exists():
        conn.executescript(schema_path.read_text())

    # Insert Rigveda
    conn.execute(
        "INSERT OR IGNORE INTO vedas (id, name, name_devanagari, name_display) VALUES (1, 'rigveda', 'ऋग्वेदः', 'Rigveda')"
    )
    veda_id = 1

    total_verses = 0

    for mandala_num in range(1, 11):
        mandala_dir = CORPUS_ROOT / f"mandala_{mandala_num}"
        if not mandala_dir.exists():
            print(f"  Skipping mandala {mandala_num}: directory not found")
            continue

        # Insert division (mandala)
        mandala_name = f"mandala_{mandala_num}"
        mandala_deva = f"मण्डल {mandala_num}"
        conn.execute(
            "INSERT OR IGNORE INTO divisions (veda_id, number, name, name_devanagari) VALUES (?, ?, ?, ?)",
            (veda_id, mandala_num, mandala_name, mandala_deva),
        )
        division_id = conn.execute(
            "SELECT id FROM divisions WHERE veda_id = ? AND number = ?",
            (veda_id, mandala_num),
        ).fetchone()[0]

        # Find all sukta directories
        sukta_dirs = sorted(
            [d for d in mandala_dir.iterdir() if d.is_dir() and d.name.startswith("sukta_")],
            key=lambda d: int(d.name.split("_")[1]),
        )

        for sukta_dir in sukta_dirs:
            sukta_num = int(sukta_dir.name.split("_")[1])

            # Find JSON file
            json_file = sukta_dir / f"{mandala_num}.{sukta_num}.json"
            if not json_file.exists():
                continue

            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            text = data.get('text', '')
            if not text:
                continue

            # Parse metadata from first line
            lines = text.strip().split('\n')
            meta_line = lines[0].strip() if lines else ''
            remaining_text = '\n'.join(lines[1:]).strip()

            rishi, devata_raw, chandas = parse_metadata_line(meta_line)
            devata_map = parse_devata_ranges(devata_raw) if devata_raw else {}
            default_devata = devata_map.get(0, devata_raw)

            # Insert subdivision (sukta)
            sukta_name = f"sukta_{sukta_num:03d}"
            conn.execute(
                "INSERT OR IGNORE INTO subdivisions (division_id, number, name, rishi, devata, chandas) VALUES (?, ?, ?, ?, ?, ?)",
                (division_id, sukta_num, sukta_name, rishi, default_devata, chandas),
            )
            subdivision_id = conn.execute(
                "SELECT id FROM subdivisions WHERE division_id = ? AND number = ?",
                (division_id, sukta_num),
            ).fetchone()[0]

            # Parse individual verses
            verses = parse_verses(remaining_text)

            # Parse baraha file
            baraha_file = sukta_dir / f"{mandala_num}.{sukta_num}.baraha.md"
            baraha_data = parse_baraha_md(baraha_file)

            # Parse annotated CSV
            csv_file = sukta_dir / f"{mandala_num}.{sukta_num}_annotated.csv"
            annotations = parse_annotated_csv(csv_file)

            for verse_idx, verse_text in enumerate(verses):
                verse_num = verse_idx + 1
                reference = f"RV {mandala_num}.{sukta_num}.{verse_num}"

                # Get baraha data for this verse
                baraha_key = f"{mandala_num}.{sukta_num}.{verse_num}"
                baraha_info = baraha_data.get(baraha_key, {})
                text_baraha = baraha_info.get('samhita')
                padapatha_baraha = baraha_info.get('padapatha')

                # Get per-verse devata
                verse_devata = devata_map.get(verse_num, default_devata)

                conn.execute(
                    """INSERT OR IGNORE INTO verses
                       (veda_id, subdivision_id, verse_number, reference,
                        text_devanagari, text_baraha, padapatha_baraha,
                        rishi, devata, chandas)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (veda_id, subdivision_id, verse_num, reference,
                     verse_text, text_baraha, padapatha_baraha,
                     rishi, verse_devata, chandas),
                )

                verse_id = conn.execute(
                    "SELECT id FROM verses WHERE reference = ?", (reference,)
                ).fetchone()
                if not verse_id:
                    continue
                verse_id = verse_id[0]

                # Insert word annotations
                verse_annotations = annotations.get(verse_num, [])
                for ann in verse_annotations:
                    conn.execute(
                        """INSERT OR IGNORE INTO word_annotations
                           (verse_id, position, word, lemma, verbal_root, pos, case_num, number_num, gender_num)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (verse_id, ann['position'], ann['word'], ann['lemma'],
                         ann['verbal_root'], ann['pos'], ann['case_num'],
                         ann['number_num'], ann['gender_num']),
                    )

                total_verses += 1

        conn.commit()
        print(f"  Mandala {mandala_num}: imported")

    conn.commit()
    conn.close()
    print(f"\nRigveda import complete: {total_verses} verses")
    return total_verses


if __name__ == '__main__':
    print("Importing Rigveda...")
    import_rigveda()
