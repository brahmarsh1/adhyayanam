import { useState, useMemo, useEffect } from "react";
import type { StudyCard } from "../../types";
import { selectBlankWords, looseMatch } from "../../lib/verseParser";
import { useSessionStore } from "../../stores/sessionStore";

interface Props {
  studyCard: StudyCard;
}

export default function FillBlankDrill({ studyCard }: Props) {
  const { verse } = studyCard;
  const revealAnswer = useSessionStore((s) => s.revealAnswer);

  const blanks = useMemo(() => selectBlankWords(verse.text_devanagari, 2), [verse.id]);
  const [answers, setAnswers] = useState<string[]>(blanks.map(() => ""));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.ctrlKey) {
        e.preventDefault();
        revealAnswer();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealAnswer]);

  const words = verse.text_devanagari
    .replace(/[॥।\d]+/g, " ")
    .trim()
    .split(/\s+/);

  return (
    <div className="bg-white rounded-2xl border border-amber-200/60 p-8 shadow-sm">
      <div className="text-[11px] text-amber-600/80 uppercase tracking-widest mb-6 font-medium">
        Fill in the missing words
      </div>

      <div className="verse-reference mb-5">{verse.reference}</div>

      <div className="vedic-text text-xl leading-[2.5] mb-6 flex flex-wrap gap-x-2 gap-y-1 items-baseline">
        {words.map((word, i) => {
          const blankIdx = blanks.findIndex((b) => b.index === i);
          if (blankIdx !== -1) {
            const isCorrect = answers[blankIdx] && looseMatch(answers[blankIdx], blanks[blankIdx].word);
            return (
              <input
                key={i}
                type="text"
                value={answers[blankIdx]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[blankIdx] = e.target.value;
                  setAnswers(newAnswers);
                }}
                className={`border-b-2 bg-transparent px-1 py-0.5 text-center outline-none vedic-text text-xl transition-colors duration-200 ${
                  isCorrect
                    ? "text-green-700 border-green-400 bg-green-50"
                    : "text-amber-900 border-amber-300 focus:border-amber-500"
                }`}
                style={{ width: `${Math.max(blanks[blankIdx].word.length * 0.8, 4)}ch` }}
                placeholder="?"
                autoFocus={blankIdx === 0}
              />
            );
          }
          return <span key={i}>{word}</span>;
        })}
      </div>

      <button
        onClick={revealAnswer}
        className="w-full py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-800 active:scale-[0.99] transition-all font-medium shadow-sm"
      >
        Check Answer
      </button>
    </div>
  );
}
