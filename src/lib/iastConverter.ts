/**
 * Baraha → IAST converter for Vedic Sanskrit with svara markings.
 *
 * Outputs structured segments with svara type so the UI can render
 * anudātta and svarita with clear, visible styling.
 *
 * Svara conventions in Baraha:
 *   q = anudātta (low pitch)
 *   # = svarita (falling pitch)
 *   unmarked = udātta (high pitch, default)
 *
 * IAST uses proper diacritics: ā ī ū ṛ ṝ ḷ ḹ ṃ ḥ ñ ṅ ṭ ḍ ṇ ś ṣ
 */

export interface IASTSegment {
  text: string;
  svara: "plain" | "anudatta" | "svarita";
}

// Consonant clusters — longest match first
const CONSONANTS: [string, string][] = [
  ["Sh", "ṣ"], ["Th", "ṭh"], ["Dh", "ḍh"], ["th", "th"], ["dh", "dh"],
  ["~g", "ṅ"], ["~j", "ñ"], ["~M", "m̐"],
  ["k", "k"], ["K", "kh"], ["g", "g"], ["G", "gh"],
  ["c", "c"], ["C", "ch"], ["j", "j"], ["J", "jh"],
  ["T", "ṭ"], ["D", "ḍ"], ["N", "ṇ"],
  ["t", "t"], ["d", "d"], ["n", "n"],
  ["p", "p"], ["P", "ph"], ["b", "b"], ["B", "bh"], ["m", "m"],
  ["y", "y"], ["r", "r"], ["R", "r"], ["l", "l"], ["L", "ḷ"],
  ["v", "v"], ["S", "ś"], ["s", "s"], ["h", "h"],
];

// Vowels
const VOWELS: [string, string][] = [
  ["ai", "ai"], ["au", "au"], ["RU", "ṝ"], ["Ru", "ṛ"],
  ["LU", "ḹ"], ["Lu", "ḷ"],
  ["A", "ā"], ["I", "ī"], ["U", "ū"], ["E", "e"], ["O", "o"],
  ["a", "a"], ["i", "i"], ["u", "u"], ["e", "e"], ["o", "o"],
];

const consMap = new Map(CONSONANTS);
const vowelMap = new Map(VOWELS);

function matchCons(text: string, pos: number): [string, number] | null {
  if (pos + 1 < text.length) {
    const v = consMap.get(text.slice(pos, pos + 2));
    if (v !== undefined) return [v, pos + 2];
  }
  const v = consMap.get(text[pos]);
  if (v !== undefined) return [v, pos + 1];
  return null;
}

function matchVowel(text: string, pos: number): [string, number] | null {
  if (pos + 1 < text.length) {
    const v = vowelMap.get(text.slice(pos, pos + 2));
    if (v !== undefined) return [v, pos + 2];
  }
  if (pos < text.length) {
    const v = vowelMap.get(text[pos]);
    if (v !== undefined) return [v, pos + 1];
  }
  return null;
}

/**
 * Convert Baraha to IAST segments with svara information.
 *
 * Each segment is a syllable or punctuation chunk tagged with its svara type.
 * The UI renders anudātta and svarita with distinct visual styles.
 */
export function barahaToIASTSegments(text: string): IASTSegment[] {
  // First pass: convert to IAST with inline svara markers
  const tokens: { text: string; svara: "plain" | "anudatta" | "svarita" }[] = [];
  let current = "";
  let currentSvara: "plain" | "anudatta" | "svarita" = "plain";
  let i = 0;
  const n = text.length;

  function flush() {
    if (current) {
      tokens.push({ text: current, svara: currentSvara });
      current = "";
      currentSvara = "plain";
    }
  }

  while (i < n) {
    const ch = text[i];

    // Parenthesized annotations
    if (ch === "(") {
      if (text.slice(i, i + 4) === "(gm)") {
        current += "ṃ";
        i += 4;
        continue;
      }
      const close = text.indexOf(")", i);
      if (close !== -1) {
        i = close + 1;
        continue;
      }
    }

    // OM
    if (text.slice(i, i + 2) === "OM" && (i + 2 >= n || !/[a-zA-Z]/.test(text[i + 2]))) {
      current += "oṃ";
      i += 2;
      continue;
    }

    // Dandas
    if (text.slice(i, i + 2) === "||") {
      current += "‖";
      i += 2;
      continue;
    }
    if (ch === "|") {
      current += "|";
      i += 1;
      continue;
    }

    // Avagraha
    if (ch === "&") {
      current += "'";
      i += 1;
      continue;
    }

    // Svara marks — flush current segment and set svara for preceding content
    if (ch === "q") {
      // anudātta applies to the current accumulated syllable
      if (current) {
        tokens.push({ text: current, svara: "anudatta" });
        current = "";
        currentSvara = "plain";
      }
      i++;
      continue;
    }
    if (ch === "#") {
      // svarita applies to the current accumulated syllable
      if (current) {
        tokens.push({ text: current, svara: "svarita" });
        current = "";
        currentSvara = "plain";
      }
      i++;
      continue;
    }

    // Anusvara M (when not part of a consonant cluster)
    if (ch === "M") {
      current += "ṃ";
      i++;
      continue;
    }

    // Visarga H (when at end or followed by space/punctuation)
    if (ch === "H" && (i + 1 >= n || " \t\n|".includes(text[i + 1]))) {
      current += "ḥ";
      i++;
      continue;
    }

    // Consonant
    const cons = matchCons(text, i);
    if (cons) {
      // Flush if we have accumulated plain text and are starting a new syllable
      // Actually we want to accumulate syllable-by-syllable for svara assignment
      const syllable: string[] = [cons[0]];
      i = cons[1];

      // Consonant cluster
      while (i < n) {
        const vowelCheck = matchVowel(text, i);
        if (vowelCheck) break;
        if ("q#MH \t\n|&()$[].,;:!?'\"".includes(text[i])) break;
        if (text[i] >= "0" && text[i] <= "9") break;
        const nextCons = matchCons(text, i);
        if (nextCons) {
          syllable.push(nextCons[0]);
          i = nextCons[1];
        } else {
          break;
        }
      }

      // Vowel
      const vowel = matchVowel(text, i);
      if (vowel) {
        syllable.push(vowel[0]);
        i = vowel[1];
      }

      // Anusvara/visarga that follow
      while (i < n) {
        if (text[i] === "M") {
          syllable.push("ṃ");
          i++;
        } else if (text[i] === "H" && (i + 1 >= n || " \t\n|q#".includes(text[i + 1]))) {
          syllable.push("ḥ");
          i++;
        } else {
          break;
        }
      }

      // Flush any preceding plain text
      flush();
      current = syllable.join("");

      // Check if svara mark follows
      if (i < n && text[i] === "q") {
        tokens.push({ text: current, svara: "anudatta" });
        current = "";
        i++;
      } else if (i < n && text[i] === "#") {
        tokens.push({ text: current, svara: "svarita" });
        current = "";
        i++;
      } else {
        flush();
      }
      continue;
    }

    // Independent vowel
    const vowel = matchVowel(text, i);
    if (vowel) {
      flush();
      current = vowel[0];
      i = vowel[1];

      // Anusvara/visarga
      while (i < n) {
        if (text[i] === "M") {
          current += "ṃ";
          i++;
        } else if (text[i] === "H" && (i + 1 >= n || " \t\n|q#".includes(text[i + 1]))) {
          current += "ḥ";
          i++;
        } else {
          break;
        }
      }

      // Svara
      if (i < n && text[i] === "q") {
        tokens.push({ text: current, svara: "anudatta" });
        current = "";
        i++;
      } else if (i < n && text[i] === "#") {
        tokens.push({ text: current, svara: "svarita" });
        current = "";
        i++;
      } else {
        flush();
      }
      continue;
    }

    // Skip: $ (pluta), [] (section markers), . (retroflex)
    if ("$[].".includes(ch)) {
      i++;
      continue;
    }

    // ~ fallback
    if (ch === "~" && i + 1 < n) {
      const two = text.slice(i, i + 2);
      if (two === "~M") { current += "m̐"; i += 2; continue; }
      if (two === "~g") { current += "ṅ"; i += 2; continue; }
      if (two === "~j") { current += "ñ"; i += 2; continue; }
    }

    // Spaces, digits, other — just accumulate
    current += ch;
    i++;
  }

  flush();

  // Merge adjacent segments of same svara type
  const merged: IASTSegment[] = [];
  for (const tok of tokens) {
    if (merged.length > 0 && merged[merged.length - 1].svara === tok.svara) {
      merged[merged.length - 1].text += tok.text;
    } else {
      merged.push({ ...tok });
    }
  }

  return merged;
}

/**
 * Simple flat string conversion (no svara markup) for contexts where
 * React rendering isn't available.
 */
export function barahaToIAST(text: string): string {
  return barahaToIASTSegments(text).map((s) => s.text).join("");
}
