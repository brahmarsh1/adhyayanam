/**
 * Split a Devanagari verse into padas (quarter-verses) on danda (।)
 */
export function splitIntoPadas(text: string): string[] {
  return text
    .split(/[।|]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.match(/^[॥\d]+$/));
}

/**
 * Get the first pada of a verse (for recitation drill prompt)
 */
export function getFirstPada(text: string): string {
  const padas = splitIntoPadas(text);
  return padas[0] || text.slice(0, 30) + "…";
}

/**
 * Get N random content words from text for fill-in-the-blank
 * Prefers longer words (more likely to be content words)
 */
export function selectBlankWords(
  text: string,
  count: number = 2
): { word: string; index: number }[] {
  // Strip verse numbers and dandas
  const cleaned = text.replace(/[॥।\d]+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);

  if (words.length <= count) {
    return words.map((word, index) => ({ word, index }));
  }

  // Prefer longer words (content words tend to be longer)
  const sorted = words
    .map((word, index) => ({ word, index, len: word.length }))
    .sort((a, b) => b.len - a.len);

  // Pick from top half, randomly
  const candidates = sorted.slice(0, Math.max(count * 3, sorted.length));
  const selected: { word: string; index: number }[] = [];
  const used = new Set<number>();

  while (selected.length < count && selected.length < candidates.length) {
    const i = Math.floor(Math.random() * candidates.length);
    if (!used.has(i)) {
      used.add(i);
      selected.push({ word: candidates[i].word, index: candidates[i].index });
    }
  }

  return selected.sort((a, b) => a.index - b.index);
}

/**
 * Strip Vedic accent marks for comparison
 */
export function stripAccents(text: string): string {
  return text
    .replace(/[\u0951\u0952\u0953\u0954]/g, "") // svarita, anudatta, etc.
    .replace(/[\u0300-\u036f]/g, "") // combining diacriticals
    .trim();
}

/**
 * Compare two Devanagari strings loosely (ignoring accents, whitespace)
 */
export function looseMatch(input: string, expected: string): boolean {
  const norm = (s: string) =>
    stripAccents(s).replace(/\s+/g, "").toLowerCase();
  return norm(input) === norm(expected);
}
