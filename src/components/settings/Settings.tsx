import { useEffect } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import type { DrillMode } from "../../types";

const drillModeLabels: Record<DrillMode, string> = {
  recitation: "Recitation",
  fill_blank: "Fill in the Blank",
  metadata: "Metadata Quiz",
};

export default function Settings() {
  const settings = useSettingsStore();

  useEffect(() => {
    settings.load();
  }, []);

  const handleDrillModeToggle = (mode: DrillMode) => {
    const current = settings.enabledDrillModes;
    const updated = current.includes(mode)
      ? current.filter((m) => m !== mode)
      : [...current, mode];
    if (updated.length > 0) {
      settings.update("enabled_drill_modes", JSON.stringify(updated));
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-amber-900">Settings</h2>

      <Section title="Study">
        <NumberSetting
          label="New cards per day"
          value={settings.newCardsPerDay}
          onChange={(v) => settings.update("new_cards_per_day", String(v))}
        />
        <NumberSetting
          label="Max reviews per day"
          value={settings.maxReviewsPerDay}
          onChange={(v) => settings.update("max_reviews_per_day", String(v))}
        />
      </Section>

      <Section title="Drill Modes">
        {(["recitation", "fill_blank", "metadata"] as DrillMode[]).map((mode) => (
          <label key={mode} className="flex items-center gap-3 py-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={settings.enabledDrillModes.includes(mode)}
              onChange={() => handleDrillModeToggle(mode)}
              className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              {drillModeLabels[mode]}
            </span>
          </label>
        ))}
      </Section>

      <Section title="Display">
        <div className="space-y-1.5">
          <label className="text-sm text-gray-500 text-xs uppercase tracking-wider">Script</label>
          <select
            value={settings.displayScript}
            onChange={(e) => settings.update("display_script", e.target.value)}
            className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white"
          >
            <option value="devanagari">Devanagari only</option>
            <option value="baraha">IAST only</option>
            <option value="both">Both (Devanagari + IAST)</option>
          </select>
        </div>
        <NumberSetting
          label="Font size (px)"
          value={settings.fontSize}
          onChange={(v) => {
            settings.update("font_size", String(v));
            document.documentElement.style.setProperty("--vedic-font-size", `${v}px`);
          }}
          min={14}
          max={36}
        />
      </Section>

      <Section title="Keyboard Shortcuts">
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between items-center">
            <span>Reveal answer</span>
            <div className="flex gap-1"><kbd>Space</kbd></div>
          </div>
          <div className="flex justify-between items-center">
            <span>Grade card</span>
            <div className="flex gap-1"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd></div>
          </div>
          <div className="flex justify-between items-center">
            <span>Quiz answer</span>
            <div className="flex gap-1"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd></div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-200/60 p-6">
      <h3 className="font-semibold text-amber-900 mb-4 text-sm uppercase tracking-wider">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function NumberSetting({
  label,
  value,
  onChange,
  min = 1,
  max = 999,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v) && v >= min && v <= max) onChange(v);
        }}
        className="w-20 px-2 py-1.5 border border-amber-200 rounded-lg text-sm text-center bg-white"
      />
    </div>
  );
}
