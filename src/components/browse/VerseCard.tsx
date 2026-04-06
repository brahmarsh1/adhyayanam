import { useState } from "react";
import type { Verse } from "../../types";
import { useSettingsStore } from "../../stores/settingsStore";
import IASTText from "../IASTText";

interface Props {
  verse: Verse;
}

const pathaTypes = [
  { key: "padapatha", label: "Padapatha", labelDeva: "पदपाठ", devaField: "padapatha_devanagari", barahaField: "padapatha_baraha" },
  { key: "kramapatha", label: "Kramapatha", labelDeva: "क्रमपाठ", devaField: "kramapatha_devanagari", barahaField: "kramapatha_baraha" },
  { key: "jatapatha", label: "Jatapatha", labelDeva: "जटापाठ", devaField: "jatapatha_devanagari", barahaField: "jatapatha_baraha" },
  { key: "ghanapatha", label: "Ghanapatha", labelDeva: "घनपाठ", devaField: "ghanapatha_devanagari", barahaField: "ghanapatha_baraha" },
] as const;

export default function VerseCard({ verse }: Props) {
  const displayScript = useSettingsStore((s) => s.displayScript);
  const [openPatha, setOpenPatha] = useState<string | null>(null);

  const availablePathas = pathaTypes.filter(
    (p) => verse[p.devaField] || verse[p.barahaField]
  );

  return (
    <div className="bg-white rounded-2xl border border-amber-200/60 p-5 card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="verse-reference">{verse.reference}</span>
        <div className="flex gap-2 text-[11px] text-gray-400">
          {verse.devata && <span>{verse.devata}</span>}
          {verse.chandas && (
            <>
              <span className="text-gray-300">&middot;</span>
              <span>{verse.chandas}</span>
            </>
          )}
        </div>
      </div>

      {/* Samhita patha */}
      {(displayScript === "devanagari" || displayScript === "both") && (
        <div className="vedic-text text-gray-900 mb-1">{verse.text_devanagari}</div>
      )}
      {(displayScript === "baraha" || displayScript === "both") && verse.text_baraha && (
        <div className="baraha-text mb-1">
          <IASTText baraha={verse.text_baraha} />
        </div>
      )}

      {/* Patha tabs */}
      {availablePathas.length > 0 && (
        <div className="mt-4 pt-3 border-t border-amber-100/80">
          <div className="flex gap-1 mb-2">
            {availablePathas.map((patha) => (
              <button
                key={patha.key}
                onClick={() => setOpenPatha(openPatha === patha.key ? null : patha.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
                  openPatha === patha.key
                    ? "bg-amber-100 text-amber-800"
                    : "text-gray-400 hover:text-amber-700 hover:bg-amber-50"
                }`}
              >
                {patha.labelDeva}
              </button>
            ))}
          </div>
          {openPatha && (() => {
            const patha = availablePathas.find((p) => p.key === openPatha);
            if (!patha) return null;
            const devaText = verse[patha.devaField];
            const barahaText = verse[patha.barahaField];
            return (
              <div className="animate-fade-in pl-3 py-2 border-l-2 border-amber-200/60">
                {(displayScript === "devanagari" || displayScript === "both") && devaText && (
                  <div className="vedic-text text-gray-700 text-[16px] leading-relaxed">
                    {devaText}
                  </div>
                )}
                {(displayScript === "baraha" || displayScript === "both") && barahaText && (
                  <div className="baraha-text mt-1 text-xs">
                    <IASTText baraha={barahaText} />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
