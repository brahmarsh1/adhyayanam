import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import type { DashboardStats } from "../../types";

export default function Header() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    invoke<DashboardStats>("get_dashboard_stats").then(setStats).catch(() => {});
  }, []);

  return (
    <header className="h-12 bg-white/80 backdrop-blur-sm border-b border-amber-200/60 flex items-center justify-between px-6 shrink-0">
      <div className="text-sm">
        {stats && stats.due_today > 0 && (
          <Link
            to="/study"
            className="text-amber-700 font-medium hover:text-amber-900 transition-colors"
          >
            {stats.due_today} cards due &rarr;
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {stats && (
          <>
            {stats.current_streak > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                <span>&#x2605;</span>
                <span>{stats.current_streak}d streak</span>
              </div>
            )}
            {stats.reviewed_today > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span>{stats.reviewed_today} today</span>
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
}
