#!/usr/bin/env python3
"""Baraha transliteration → Devanagari Unicode converter for Vedic Sanskrit.

This is the reverse of the converter at ~/brahmarsh1/sruti/rigveda/_shared/baraha_converter.py.
Handles Vedic svara marks (anudatta, svarita) and special Taittiriya Samhita conventions.
"""

import re

# Reverse maps: Baraha → Devanagari
# Multi-character tokens MUST be checked before single-character ones (longest match first)

# Consonants (ordered by length descending for longest-match)
CONSONANT_MAP = [
    ('Sh', '\u0937'),   # ष
    ('Th', '\u0920'),   # ठ
    ('Dh', '\u0922'),   # ढ
    ('th', '\u0925'),   # थ
    ('dh', '\u0927'),   # ध
    ('~g', '\u0919'),   # ङ
    ('~j', '\u091E'),   # ञ
    ('~M', '\u0901'),   # ँ chandrabindu — as combining mark when after consonant
    ('k', '\u0915'),    # क
    ('K', '\u0916'),    # ख
    ('g', '\u0917'),    # ग
    ('G', '\u0918'),    # घ
    ('c', '\u091A'),    # च
    ('C', '\u091B'),    # छ
    ('j', '\u091C'),    # ज
    ('J', '\u091D'),    # झ
    ('T', '\u091F'),    # ट
    ('D', '\u0921'),    # ड
    ('N', '\u0923'),    # ण
    ('t', '\u0924'),    # त
    ('d', '\u0926'),    # द
    ('n', '\u0928'),    # न
    ('p', '\u092A'),    # प
    ('P', '\u092B'),    # फ
    ('b', '\u092C'),    # ब
    ('B', '\u092D'),    # भ
    ('m', '\u092E'),    # म
    ('y', '\u092F'),    # य
    ('r', '\u0930'),    # र
    ('R', '\u0931'),    # ऱ (nukta r, rare - but 'R' is also used for ऋ vowel)
    ('l', '\u0932'),    # ल
    ('L', '\u0933'),    # ळ
    ('v', '\u0935'),    # व
    ('S', '\u0936'),    # श
    ('s', '\u0938'),    # स
    ('h', '\u0939'),    # ह
]

# Independent vowels (longest match first)
VOWEL_MAP = [
    ('ai', '\u0910'),   # ऐ
    ('au', '\u0914'),   # औ
    ('RU', '\u0960'),   # ॠ
    ('Ru', '\u090B'),   # ऋ
    ('LU', '\u0961'),   # ॡ
    ('Lu', '\u090C'),   # ऌ
    ('A', '\u0906'),    # आ
    ('I', '\u0908'),    # ई
    ('U', '\u090A'),    # ऊ
    ('E', '\u090D'),    # ऍ
    ('O', '\u0911'),    # ऑ
    ('a', '\u0905'),    # अ
    ('i', '\u0907'),    # इ
    ('u', '\u0909'),    # उ
    ('e', '\u090F'),    # ए
    ('o', '\u0913'),    # ओ
]

# Vowel signs / matras (same order)
MATRA_MAP = [
    ('ai', '\u0948'),   # ै
    ('au', '\u094C'),   # ौ
    ('RU', '\u0944'),   # ॄ
    ('Ru', '\u0943'),   # ृ
    ('LU', '\u0963'),   # ॣ
    ('Lu', '\u0962'),   # ॢ
    ('A', '\u093E'),    # ा
    ('I', '\u0940'),    # ी
    ('U', '\u0942'),    # ू
    ('E', '\u0945'),    # ॅ
    ('O', '\u0949'),    # ॉ
    ('a', ''),          # inherent a — no matra needed
    ('i', '\u093F'),    # ि
    ('u', '\u0941'),    # ु
    ('e', '\u0947'),    # े
    ('o', '\u094B'),    # ो
]

# Combining marks
COMBINING_MAP = [
    ('~M', '\u0901'),   # ँ chandrabindu
    ('M', '\u0902'),    # ं anusvara
    ('H', '\u0903'),    # ः visarga
    ('#', '\u0951'),    # ॑ svarita
    ('q', '\u0952'),    # ॒ anudatta
]

# Special characters
SPECIAL_MAP = [
    ('OM', '\u0950'),   # ॐ
    ('||', '\u0965'),   # ॥
    ('|', '\u0964'),    # ।
    ('&', '\u093D'),    # ऽ avagraha
    ('&&', '\u093D\u093D'),  # double avagraha
]

# Digits
DIGIT_MAP = {str(i): chr(0x0966 + i) for i in range(10)}

VIRAMA = '\u094D'

# Build lookup structures
_CONSONANT_SET = {baraha for baraha, _ in CONSONANT_MAP}
_CONSONANT_DICT = {baraha: deva for baraha, deva in CONSONANT_MAP}
_VOWEL_DICT = {baraha: deva for baraha, deva in VOWEL_MAP}
_MATRA_DICT = {baraha: deva for baraha, deva in MATRA_MAP}
_COMBINING_DICT = {baraha: deva for baraha, deva in COMBINING_MAP}


def _match_consonant(text, pos):
    """Try to match a consonant token at pos. Return (devanagari, new_pos) or None."""
    # Try 2-char first, then 1-char
    if pos + 1 < len(text):
        two = text[pos:pos+2]
        if two in _CONSONANT_DICT:
            return _CONSONANT_DICT[two], pos + 2
    one = text[pos]
    if one in _CONSONANT_DICT:
        return _CONSONANT_DICT[one], pos + 1
    return None


def _match_vowel(text, pos, as_matra=False):
    """Try to match a vowel token at pos. Return (devanagari, new_pos) or None."""
    d = _MATRA_DICT if as_matra else _VOWEL_DICT
    if pos + 1 < len(text):
        two = text[pos:pos+2]
        if two in d:
            return d[two], pos + 2
    if pos < len(text):
        one = text[pos]
        if one in d:
            return d[one], pos + 1
    return None


def _match_combining(text, pos):
    """Try to match a combining mark at pos."""
    if pos + 1 < len(text):
        two = text[pos:pos+2]
        if two in _COMBINING_DICT:
            return _COMBINING_DICT[two], pos + 2
    if pos < len(text):
        one = text[pos]
        if one in _COMBINING_DICT:
            return _COMBINING_DICT[one], pos + 1
    return None


def _match_special(text, pos):
    """Try to match a special character."""
    for baraha, deva in SPECIAL_MAP:
        end = pos + len(baraha)
        if text[pos:end] == baraha:
            return deva, end
    return None


def baraha_to_devanagari(text: str) -> str:
    """Convert Baraha transliteration to Devanagari Unicode."""
    result = []
    i = 0
    n = len(text)

    while i < n:
        # Skip TS-specific annotations in parentheses like (gm), (A1), etc.
        if text[i] == '(' and i + 1 < n:
            # Check for (gm) — gomukha anusvara
            if text[i:i+4] == '(gm)':
                result.append('\u0902')  # anusvara
                i += 4
                continue
            # Check for ($) — pluta marker
            # Skip other parenthesized annotations
            j = text.find(')', i)
            if j != -1:
                inner = text[i+1:j]
                # If it's a verse annotation like (A1), skip it
                if re.match(r'^A\d+$', inner) or re.match(r'^[\s\w\u0900-\u097F#q,\-\(\)]+$', inner):
                    # This is likely an anuvaka annotation — skip
                    i = j + 1
                    continue

        # Try special characters first (OM, ||, |, &)
        sp = _match_special(text, i)
        if sp:
            result.append(sp[0])
            i = sp[1]
            continue

        # Try consonant
        cons = _match_consonant(text, i)
        if cons:
            consonants = [cons[0]]
            i = cons[1]

            # Collect consonant clusters (conjuncts)
            while i < n:
                next_cons = _match_consonant(text, i)
                if next_cons:
                    # Check if this is actually a new syllable (preceded by a vowel match)
                    # In Baraha, consonant clusters are written directly: "kSh" = क्ष
                    # But "ka" = क (consonant + vowel)
                    # We need to check: is the next char a vowel?
                    vowel_check = _match_vowel(text, i, as_matra=True)
                    if vowel_check:
                        break  # It's a vowel, end this syllable
                    # Check combining marks
                    comb_check = _match_combining(text, i)
                    if comb_check:
                        break  # combining mark, end consonant cluster
                    consonants.append(next_cons[0])
                    i = next_cons[1]
                else:
                    break

            # Output consonants with viramas between them
            for ci, c in enumerate(consonants):
                result.append(c)
                if ci < len(consonants) - 1:
                    result.append(VIRAMA)

            # Now try to match a vowel (as matra)
            vowel = _match_vowel(text, i, as_matra=True)
            if vowel:
                if vowel[0]:  # non-empty matra (not inherent 'a')
                    result.append(vowel[0])
                # else: inherent 'a', no matra needed
                i = vowel[1]
            else:
                # Check if we're at end or next is space/special — add virama
                if i >= n or text[i] in ' \t\n' or text[i] in '|()-[]{}.,;:!?\'"0123456789':
                    result.append(VIRAMA)
                elif _match_combining(text, i):
                    pass  # combining mark follows, inherent 'a'
                else:
                    # Check if next char is not matchable — virama
                    result.append(VIRAMA)

            # Collect combining marks (anusvara, visarga, accents)
            while i < n:
                comb = _match_combining(text, i)
                if comb:
                    result.append(comb[0])
                    i = comb[1]
                else:
                    break

            continue

        # Try independent vowel
        vowel = _match_vowel(text, i, as_matra=False)
        if vowel:
            result.append(vowel[0])
            i = vowel[1]

            # Collect combining marks
            while i < n:
                comb = _match_combining(text, i)
                if comb:
                    result.append(comb[0])
                    i = comb[1]
                else:
                    break
            continue

        # Try combining mark standalone
        comb = _match_combining(text, i)
        if comb:
            result.append(comb[0])
            i = comb[1]
            continue

        # Digits — convert to Devanagari digits
        if text[i].isdigit():
            result.append(DIGIT_MAP.get(text[i], text[i]))
            i += 1
            continue

        # Handle $ (pluta marker in TS)
        if text[i] == '$':
            # Pluta vowel — represented by tripling the vowel mark, but simplified here
            i += 1
            continue

        # Handle [ ] markers (section markers in TS)
        if text[i] in '[]':
            i += 1
            continue

        # Handle .  (used in TS for retroflex l: r. = ड़-like)
        if text[i] == '.' and i + 1 < n:
            # Could be part of a compound like "r." or standalone period
            i += 1
            continue

        # Everything else passes through
        result.append(text[i])
        i += 1

    return ''.join(result)


# Self-test
if __name__ == '__main__':
    tests = [
        ('aqgnimI#Le', 'अ॒ग्निमी॑ळे'),
        ('puqrohi#taM', 'पु॒रोहि॑तं'),
        ('yaqj~jasya#', 'य॒ज्ञस्य॑'),
        ('hotA#raM', 'होता॑रं'),
        ('namaH#', 'नमः॑'),
        ('OM', 'ॐ'),
    ]
    passed = 0
    for baraha, expected in tests:
        got = baraha_to_devanagari(baraha)
        ok = got == expected
        status = '✓' if ok else '✗'
        print(f'  {status} "{baraha}" → "{got}"' + (f' (expected "{expected}")' if not ok else ''))
        if ok:
            passed += 1
    print(f'\n{passed}/{len(tests)} passed')
