import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: "\u25A6" },
  { to: "/study", label: "Study", icon: "\u0950" },
  { to: "/browse", label: "Browse", icon: "\u0936" },
  { to: "/settings", label: "Settings", icon: "\u2699" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gradient-to-b from-amber-950 to-amber-900 text-amber-50 flex flex-col h-full">
      <div className="p-5 border-b border-amber-800/50">
        <h1 className="text-2xl font-bold tracking-wide leading-tight">
          अध्ययनम्
        </h1>
        <p className="text-[11px] text-amber-400/80 mt-1 tracking-widest uppercase">
          Adhyayanam
        </p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-amber-800/60 text-white shadow-sm"
                  : "text-amber-200/80 hover:bg-amber-800/30 hover:text-white"
              }`
            }
          >
            <span className="text-lg w-6 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-amber-800/30 text-[10px] text-amber-500/60 tracking-wider">
        v0.1
      </div>
    </aside>
  );
}
