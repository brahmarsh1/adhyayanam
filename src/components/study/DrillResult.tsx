import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { StudyCard, Quality, SrsUpdate } from "../../types";
import { useSessionStore } from "../../stores/sessionStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { intervalDisplay, sm2 } from "../../lib/srs";
import IASTText from "../IASTText";

interface Props {
  studyCard: StudyCard;
}

const gradeButtons: { quality: Quality; label: string; color: string; key: string }[] = [
  { quality: 0, label: "Again", color: "bg-red-500 hover:bg-red-600 active:bg-red-700", key: "1" },
  { quality: 2, label: "Hard", color: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700", key: "2" },
  { quality: 3, label: "Good", color: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700", key: "3" },
  { quality: 5, label: "Easy", color: "bg-green-500 hover:bg-green-600 active:bg-green-700", key: "4" },
];

export default function DrillResult({ studyCard }: Props) {
  const { verse, card } = studyCard;
  const { nextCard, recordReview } = useSessionStore();
  const displayScript = useSettingsStore((s) => s.displayScript);

  const handleGrade = async (quality: Quality) => {
    try {
      const update = await invoke<SrsUpdate>("submit_review", {
        cardId: card.id,
        quality,
      });
      recordReview(quality >= 3, update);
      nextCard();
    } catch (err) {
      console.error(err);
    }
  };

  // Keyboard shortcuts: 1-4 for grading
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        e.preventDefault();
        handleGrade(gradeButtons[num - 1].quality);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [card.id]);

  const previews = gradeButtons.map((btn) => {
    const result = sm2({
      quality: btn.quality,
      repetitions: card.repetitions,
      easeFactor: card.ease_factor,
      intervalDays: card.interval_days,
    });
    return intervalDisplay(result.intervalDays);
  });

  const pathas = [
    { label: "पदपाठ", text: verse.padapatha_devanagari },
    { label: "क्रमपाठ", text: verse.kramapatha_devanagari },
    { label: "जटापाठ", text: verse.jatapatha_devanagari },
    { label: "घनपाठ", text: verse.ghanapatha_devanagari },
  ].filter((p) => p.text);

  return (
    <div className="bg-white rounded-2xl border border-amber-200/60 p-8 shadow-sm">
      <div className="text-[11px] text-green-600/80 uppercase tracking-widest mb-6 font-medium">
        Answer
      </div>

      <div className="verse-reference mb-4">{verse.reference}</div>

      {(displayScript === "devanagari" || displayScript === "both") && (
        <div className="vedic-text text-xl leading-relaxed mb-2">{verse.text_devanagari}</div>
      )}
      {(displayScript === "baraha" || displayScript === "both") && verse.text_baraha && (
        <div className="baraha-text mb-2">
          <IASTText baraha={verse.text_baraha} />
        </div>
      )}

      {/* Patha formats as compact pills */}
      {pathas.length > 0 && (
        <div className="mt-3 space-y-2">
          {pathas.map((p) => (
            <details key={p.label} className="group">
              <summary className="text-[11px] text-amber-600 cursor-pointer hover:text-amber-800 font-medium py-0.5 transition-colors">
                {p.label}
              </summary>
              <div className="animate-fade-in pl-3 py-1.5 border-l-2 border-amber-200/60 mt-1">
                <div className="vedic-text text-base text-gray-600 leading-relaxed">{p.text}</div>
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Metadata */}
      {(verse.rishi || verse.devata || verse.chandas) && (
        <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-gray-400">
          {verse.rishi && <span>Rishi: <span className="text-gray-600">{verse.rishi}</span></span>}
          {verse.devata && <span>Devata: <span className="text-gray-600">{verse.devata}</span></span>}
          {verse.chandas && <span>Chandas: <span className="text-gray-600">{verse.chandas}</span></span>}
        </div>
      )}

      {/* Grading */}
      <div className="border-t border-amber-100 mt-6 pt-5">
        <div className="text-[11px] text-gray-400 mb-3 flex items-center gap-2">
          How well did you know this?
          <span className="text-gray-300">Press <kbd>1</kbd>-<kbd>4</kbd></span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {gradeButtons.map((btn, i) => (
            <button
              key={btn.quality}
              onClick={() => handleGrade(btn.quality)}
              className={`${btn.color} text-white rounded-xl py-3 px-2 transition-all active:scale-[0.97] text-sm font-medium shadow-sm`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <kbd className="bg-white/20 text-white text-[10px] border-white/30">{btn.key}</kbd>
                {btn.label}
              </div>
              <div className="text-[10px] opacity-60 mt-1">{previews[i]}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
