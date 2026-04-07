import { create } from "zustand";
import type { StudyCard, SrsUpdate, DrillMode } from "../types";

interface SessionState {
  cards: StudyCard[];
  currentIndex: number;
  currentMode: DrillMode;
  showAnswer: boolean;
  sessionStats: { reviewed: number; correct: number };
  isComplete: boolean;

  setCards: (cards: StudyCard[]) => void;
  nextCard: () => void;
  revealAnswer: () => void;
  recordReview: (correct: boolean, update: SrsUpdate) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  cards: [],
  currentIndex: 0,
  currentMode: "recitation",
  showAnswer: false,
  sessionStats: { reviewed: 0, correct: 0 },
  isComplete: false,

  setCards: (cards) =>
    set({
      cards,
      currentIndex: 0,
      showAnswer: false,
      sessionStats: { reviewed: 0, correct: 0 },
      isComplete: false,
    }),

  nextCard: () => {
    const { currentIndex, cards } = get();
    if (currentIndex + 1 >= cards.length) {
      set({ isComplete: true });
    } else {
      set({
        currentIndex: currentIndex + 1,
        showAnswer: false,
        currentMode: cards[currentIndex + 1].card.drill_mode,
      });
    }
  },

  revealAnswer: () => set({ showAnswer: true }),

  recordReview: (correct, _update) => {
    const { sessionStats } = get();
    set({
      sessionStats: {
        reviewed: sessionStats.reviewed + 1,
        correct: sessionStats.correct + (correct ? 1 : 0),
      },
    });
  },

  reset: () =>
    set({
      cards: [],
      currentIndex: 0,
      showAnswer: false,
      sessionStats: { reviewed: 0, correct: 0 },
      isComplete: false,
    }),
}));
