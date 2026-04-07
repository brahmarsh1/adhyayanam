import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import type { DashboardStats } from "../../types";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    invoke<DashboardStats>("get_dashboard_stats").then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 mt-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const accuracy = stats.accuracy_7d > 0 ? Math.round(stats.accuracy_7d * 100) : 0;
  const studiedPct =
    stats.total_verses > 0
      ? Math.round(((stats.mature_count + stats.learning_count) / stats.total_verses) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-amber-900">नमस्ते</h2>
        <p className="text-gray-500 text-sm mt-1">Your Vedic study dashboard</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/study"
          className="animate-fade-in stagger-1 card-hover bg-gradient-to-br from-amber-700 to-amber-800 text-white rounded-2xl p-6 group"
        >
          <div className="text-4xl font-bold">{stats.due_today}</div>
          <div className="text-amber-200/80 mt-1 text-sm">Cards due today</div>
          <div className="mt-4 text-sm font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
            Start Study Session
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </div>
        </Link>
        <Link
          to="/browse"
          className="animate-fade-in stagger-2 card-hover bg-white border border-amber-200/80 rounded-2xl p-6 group"
        >
          <div className="text-4xl font-bold text-amber-700">{stats.new_available.toLocaleString()}</div>
          <div className="text-gray-500 mt-1 text-sm">New verses available</div>
          <div className="mt-4 text-sm font-medium text-amber-700 flex items-center gap-2 group-hover:gap-3 transition-all">
            Browse Corpus
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Streak" value={`${stats.current_streak}d`} delay="stagger-1" />
        <StatCard label="Reviewed Today" value={String(stats.reviewed_today)} delay="stagger-2" />
        <StatCard label="7-Day Accuracy" value={`${accuracy}%`} delay="stagger-3" />
        <StatCard label="Progress" value={`${studiedPct}%`} delay="stagger-4" />
      </div>

      {/* Progress Bars */}
      <div className="animate-fade-in stagger-3 bg-white rounded-2xl p-6 border border-amber-200/80">
        <h3 className="font-semibold text-amber-900 mb-4 text-sm uppercase tracking-wider">
          Overall Progress
        </h3>
        <div className="space-y-4">
          <ProgressRow
            label="Mature"
            sublabel="21+ day interval"
            count={stats.mature_count}
            total={stats.total_verses}
            color="bg-green-500"
          />
          <ProgressRow
            label="Learning"
            sublabel="in review cycle"
            count={stats.learning_count}
            total={stats.total_verses}
            color="bg-amber-500"
          />
          <ProgressRow
            label="New"
            sublabel="not yet studied"
            count={stats.new_available}
            total={stats.total_verses}
            color="bg-gray-300"
          />
        </div>
        <div className="mt-4 pt-3 border-t border-amber-100 text-xs text-gray-400">
          {stats.total_verses.toLocaleString()} total verses in corpus
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, delay }: { label: string; value: string; delay: string }) {
  return (
    <div className={`animate-fade-in ${delay} card-hover bg-white rounded-2xl p-4 border border-amber-200/80 text-center`}>
      <div className="text-2xl font-bold text-amber-800">{value}</div>
      <div className="text-[11px] text-gray-400 mt-1.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ProgressRow({
  label,
  sublabel,
  count,
  total,
  color,
}: {
  label: string;
  sublabel: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <div>
          <span className="text-gray-800 font-medium">{label}</span>
          <span className="text-gray-400 text-xs ml-2">{sublabel}</span>
        </div>
        <span className="text-gray-500 tabular-nums">{count.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
