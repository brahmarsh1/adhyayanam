import type { Quality } from "../types";

export interface SM2Input {
  quality: Quality;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
}

export interface SM2Output {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
}

export function sm2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, intervalDays } = input;

  if (quality < 3) {
    return {
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      intervalDays: 1,
      repetitions: 0,
    };
  }

  const q = quality;
  const newEF = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  );

  let newInterval: number;
  if (repetitions === 0) {
    newInterval = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(intervalDays * newEF);
  }

  return {
    easeFactor: newEF,
    intervalDays: newInterval,
    repetitions: repetitions + 1,
  };
}

export function qualityLabel(q: Quality): string {
  switch (q) {
    case 0: return "Again";
    case 1: return "Hard";
    case 2: return "Hard";
    case 3: return "Good";
    case 4: return "Easy";
    case 5: return "Perfect";
  }
}

export function intervalDisplay(days: number): string {
  if (days === 0) return "now";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}
