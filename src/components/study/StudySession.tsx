import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import { useSessionStore } from "../../stores/sessionStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { StudyCard } from "../../types";
import RecitationDrill from "./RecitationDrill";
import FillBlankDrill from "./FillBlankDrill";
import MetadataQuiz from "./MetadataQuiz";
import DrillResult from "./DrillResult";

const drillLabels: Record<string, string> = {
  recitation: "Recitation",
  fill_blank: "Fill in the Blank",
  metadata: "Metadata Quiz",
};

export default function StudySession() {
  const { cards, currentIndex, showAnswer, isComplete, sessionStats, setCards } =
    useSessionStore();
  const { enabledDrillModes, loaded, load } = useSettingsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loaded) return;
    setLoading(true);
    invoke<StudyCard[]>("get_due_cards", {
      limit: 50,
      drillModes: enabledDrillModes,
    })
      .then((due) => {
        setCards(due);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [loaded, enabledDrillModes, setCards]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        <div className="skeleton h-2 w-full rounded-full" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center mt-20 animate-fade-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-green-600">&#x2714;</span>
        </div>
        <h2 className="text-xl font-bold text-amber-900 mb-2">All caught up!</h2>
        <p className="text-gray-500 text-sm mb-6">
          No cards due for review right now.
        </p>
        <Link
          to="/browse"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
        >
          Browse Corpus &rarr;
        </Link>
      </div>
    );
  }

  if (isComplete) {
    const accuracy =
      sessionStats.reviewed > 0
        ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
        : 0;
    return (
      <div className="max-w-md mx-auto text-center mt-20 animate-scale-in">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">&#x1F3AF;</span>
        </div>
        <h2 className="text-xl font-bold text-amber-900 mb-2">Session Complete</h2>
        <div className="flex justify-center gap-6 mt-4 mb-6 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-800">{sessionStats.reviewed}</div>
            <div className="text-gray-400 text-xs mt-0.5">Reviewed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
            <div className="text-gray-400 text-xs mt-0.5">Accuracy</div>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors text-sm font-medium"
        >
          Start New Session
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const drillMode = currentCard.card.drill_mode;
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span className="tabular-nums">
            {currentIndex + 1} / {cards.length}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-medium text-amber-700">{drillLabels[drillMode] || drillMode}</span>
            {!showAnswer && (
              <span className="text-gray-300">
                <kbd>Space</kbd> to reveal
              </span>
            )}
          </span>
        </div>
        <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="animate-scale-in" key={`${currentCard.card.id}-${showAnswer}`}>
        {showAnswer ? (
          <DrillResult studyCard={currentCard} />
        ) : (
          <>
            {drillMode === "recitation" && <RecitationDrill studyCard={currentCard} />}
            {drillMode === "fill_blank" && <FillBlankDrill studyCard={currentCard} />}
            {drillMode === "metadata" && <MetadataQuiz studyCard={currentCard} />}
          </>
        )}
      </div>
    </div>
  );
}
