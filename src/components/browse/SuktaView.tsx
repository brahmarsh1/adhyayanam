import { invoke } from "@tauri-apps/api/core";
import type { Subdivision, Verse } from "../../types";
import { useToast } from "../Toast";
import VerseCard from "./VerseCard";

interface Props {
  subdivision: Subdivision;
  verses: Verse[];
}

export default function SuktaView({ subdivision, verses }: Props) {
  const toast = useToast((s) => s.add);

  const handleAddToStudy = async () => {
    try {
      const count = await invoke<number>("add_verses_to_study", {
        subdivisionId: subdivision.id,
        drillModes: ["recitation", "fill_blank", "metadata"],
      });
      if (count > 0) {
        toast(`Added ${count} cards to study queue`, "success");
      } else {
        toast("All verses already in study queue", "info");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to add verses", "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-amber-900">
            {subdivision.name || `Subdivision ${subdivision.number}`}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            {subdivision.rishi && (
              <span className="text-gray-500">
                <span className="text-gray-400 text-xs uppercase tracking-wider">Rishi</span>{" "}
                <span className="text-gray-700">{subdivision.rishi}</span>
              </span>
            )}
            {subdivision.devata && (
              <span className="text-gray-500">
                <span className="text-gray-400 text-xs uppercase tracking-wider">Devata</span>{" "}
                <span className="text-gray-700">{subdivision.devata}</span>
              </span>
            )}
            {subdivision.chandas && (
              <span className="text-gray-500">
                <span className="text-gray-400 text-xs uppercase tracking-wider">Chandas</span>{" "}
                <span className="text-gray-700">{subdivision.chandas}</span>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleAddToStudy}
          className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 active:scale-[0.98] transition-all text-sm font-medium shadow-sm"
        >
          + Add to Study
        </button>
      </div>

      <div className="space-y-3">
        {verses.map((verse, i) => (
          <div key={verse.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
            <VerseCard verse={verse} />
          </div>
        ))}
      </div>
    </div>
  );
}
