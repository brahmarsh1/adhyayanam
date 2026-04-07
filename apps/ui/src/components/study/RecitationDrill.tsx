import { useEffect } from "react";
import type { StudyCard } from "../../types";
import { getFirstPada } from "../../lib/verseParser";
import { useSessionStore } from "../../stores/sessionStore";

interface Props {
  studyCard: StudyCard;
}

export default function RecitationDrill({ studyCard }: Props) {
  const { verse } = studyCard;
  const revealAnswer = useSessionStore((s) => s.revealAnswer);
  const firstPada = getFirstPada(verse.text_devanagari);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        revealAnswer();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealAnswer]);

  return (
    <div className="bg-white rounded-2xl border border-amber-200/60 p-8 shadow-sm">
      <div className="text-[11px] text-amber-600/80 uppercase tracking-widest mb-6 font-medium">
        Recite the rest of this verse
      </div>

      <div className="verse-reference mb-5">{verse.reference}</div>

      <div className="vedic-text text-2xl leading-relaxed mb-2">
        {firstPada}
        <span className="text-amber-300 ml-1 animate-pulse">…</span>
      </div>

      {verse.rishi && (
        <div className="text-[11px] text-gray-400 mt-6 flex gap-3">
          <span>{verse.rishi}</span>
          <span className="text-gray-300">&middot;</span>
          <span>{verse.devata}</span>
          <span className="text-gray-300">&middot;</span>
          <span>{verse.chandas}</span>
        </div>
      )}

      <button
        onClick={revealAnswer}
        className="mt-8 w-full py-3 bg-amber-700 text-white rounded-xl hover:bg-amber-800 active:scale-[0.99] transition-all font-medium shadow-sm"
      >
        Show Answer
      </button>
    </div>
  );
}
