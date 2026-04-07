import { useState, useMemo, useEffect } from "react";
import type { StudyCard } from "../../types";
import { useSessionStore } from "../../stores/sessionStore";

interface Props {
  studyCard: StudyCard;
}

type QuestionType = "rishi" | "devata" | "chandas";

const questionLabels: Record<QuestionType, string> = {
  rishi: "Who is the Rishi (seer) of this verse?",
  devata: "What is the Devata (deity) of this verse?",
  chandas: "What is the Chandas (meter) of this verse?",
};

export default function MetadataQuiz({ studyCard }: Props) {
  const { verse } = studyCard;
  const revealAnswer = useSessionStore((s) => s.revealAnswer);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const questionType: QuestionType = useMemo(() => {
    const types: QuestionType[] = [];
    if (verse.rishi) types.push("rishi");
    if (verse.devata) types.push("devata");
    if (verse.chandas) types.push("chandas");
    return types[Math.floor(Math.random() * types.length)] || "devata";
  }, [verse.id]);

  const correctAnswer = verse[questionType] || "Unknown";

  const options = useMemo(() => {
    const wrongOptions = generateWrongOptions(questionType, correctAnswer);
    const all = [correctAnswer, ...wrongOptions].slice(0, 4);
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [verse.id, questionType, correctAnswer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (selectedAnswer) return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= options.length) {
        handleSelect(options[num - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [options, selectedAnswer]);

  const handleSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setTimeout(() => revealAnswer(), 600);
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200/60 p-8 shadow-sm">
      <div className="text-[11px] text-amber-600/80 uppercase tracking-widest mb-6 font-medium">
        Metadata Quiz
      </div>

      <div className="verse-reference mb-5">{verse.reference}</div>

      <div className="vedic-text text-lg leading-relaxed mb-6">
        {verse.text_devanagari}
      </div>

      <div className="font-medium text-amber-900 mb-4 text-sm">{questionLabels[questionType]}</div>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isSelected = selectedAnswer === opt;
          const isCorrect = opt === correctAnswer;
          let style = "border-amber-200/80 hover:bg-amber-50 hover:border-amber-300";
          if (selectedAnswer) {
            if (isSelected && isCorrect) {
              style = "bg-green-50 border-green-400 text-green-800";
            } else if (isSelected && !isCorrect) {
              style = "bg-red-50 border-red-300 text-red-800";
            } else if (isCorrect) {
              style = "bg-green-50/50 border-green-300 text-green-700";
            } else {
              style = "border-gray-200 text-gray-400";
            }
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={selectedAnswer !== null}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 text-sm flex items-center gap-3 ${style}`}
            >
              <kbd className={selectedAnswer ? "opacity-30" : ""}>{i + 1}</kbd>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function generateWrongOptions(type: QuestionType, correct: string): string[] {
  const pools: Record<QuestionType, string[]> = {
    rishi: [
      "\u0935\u093F\u0936\u094D\u0935\u093E\u092E\u093F\u0924\u094D\u0930\u0903",
      "\u0935\u0938\u093F\u0937\u094D\u0920\u0903",
      "\u092D\u0930\u0926\u094D\u0935\u093E\u091C\u0903",
      "\u0917\u094B\u0924\u092E\u0903",
      "\u0905\u0924\u094D\u0930\u093F\u0903",
      "\u0935\u093E\u092E\u0926\u0947\u0935\u0903",
      "\u0915\u0923\u094D\u0935\u0903",
      "\u0905\u0919\u094D\u0917\u093F\u0930\u0938\u0903",
      "\u0926\u0940\u0930\u094D\u0918\u0924\u092E\u093E\u0903",
      "\u092E\u0947\u0927\u093E\u0924\u093F\u0925\u093F\u0903",
    ],
    devata: [
      "\u0905\u0917\u094D\u0928\u093F\u0903",
      "\u0907\u0928\u094D\u0926\u094D\u0930\u0903",
      "\u0938\u094B\u092E\u0903",
      "\u0935\u0930\u0941\u0923\u0903",
      "\u092E\u093F\u0924\u094D\u0930\u0903",
      "\u0938\u0935\u093F\u0924\u093E",
      "\u092A\u0942\u0937\u093E",
      "\u0935\u093F\u0936\u094D\u0935\u0947\u0926\u0947\u0935\u093E\u0903",
      "\u092E\u0930\u0941\u0924\u0903",
      "\u0905\u0936\u094D\u0935\u093F\u0928\u094C",
      "\u090A\u0937\u0938\u094D",
      "\u0935\u093E\u092F\u0941\u0903",
    ],
    chandas: [
      "\u0917\u093E\u092F\u0924\u094D\u0930\u0940",
      "\u0924\u094D\u0930\u093F\u0937\u094D\u091F\u0941\u092A\u094D",
      "\u091C\u0917\u0924\u0940",
      "\u0905\u0928\u0941\u0937\u094D\u091F\u0941\u092A\u094D",
      "\u0909\u0937\u094D\u0923\u093F\u0915\u094D",
      "\u092C\u0943\u0939\u0924\u0940",
      "\u092A\u0919\u094D\u0915\u094D\u0924\u093F\u0903",
      "\u0936\u0915\u094D\u0935\u0930\u0940",
    ],
  };

  return pools[type]
    .filter((w) => w !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
}
