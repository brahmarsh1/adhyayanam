import { Link } from "react-router-dom";
import type { Veda, Division, Subdivision } from "../../types";

interface Props {
  vedas: Veda[];
  divisions: Division[];
  subdivisions: Subdivision[];
  selectedVedaId?: number;
  selectedDivisionId?: number;
  selectedSubdivisionId?: number;
}

export default function VedaTree({
  vedas,
  divisions,
  subdivisions,
  selectedVedaId,
  selectedDivisionId,
  selectedSubdivisionId,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-amber-200/80 overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50">
        <h3 className="font-semibold text-amber-900 text-sm uppercase tracking-wider">Corpus</h3>
      </div>
      <div className="p-2 space-y-0.5">
        {vedas.map((veda) => (
          <div key={veda.id} className="animate-fade-in">
            <Link
              to={`/browse/${veda.id}`}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                selectedVedaId === veda.id
                  ? "bg-amber-100 text-amber-900"
                  : "text-gray-700 hover:bg-amber-50"
              }`}
            >
              <span className="text-amber-600 text-base">{veda.name_devanagari}</span>
              <span className="text-[11px] text-gray-400 ml-auto">{veda.name_display}</span>
            </Link>

            {selectedVedaId === veda.id && divisions.length > 0 && (
              <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-amber-200/60 pl-2">
                {divisions.map((div) => (
                  <div key={div.id} className="animate-slide-in">
                    <Link
                      to={`/browse/${veda.id}/${div.id}`}
                      className={`block px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                        selectedDivisionId === div.id
                          ? "bg-amber-100 text-amber-800 font-semibold"
                          : "text-gray-500 hover:bg-amber-50 hover:text-gray-700"
                      }`}
                    >
                      {div.name_devanagari || div.name}
                    </Link>

                    {selectedDivisionId === div.id && subdivisions.length > 0 && (
                      <div className="ml-2 mt-0.5 space-y-0.5 border-l border-amber-200/40 pl-2 max-h-[50vh] overflow-y-auto">
                        {subdivisions.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/browse/${veda.id}/${div.id}/${sub.id}`}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                              selectedSubdivisionId === sub.id
                                ? "bg-amber-200/70 text-amber-900 font-semibold"
                                : "text-gray-400 hover:bg-amber-50 hover:text-gray-600"
                            }`}
                          >
                            <span className="truncate">{sub.name || `#${sub.number}`}</span>
                            <span className="text-[10px] text-gray-300 ml-2 shrink-0 tabular-nums">
                              {sub.verse_count}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {vedas.length === 0 && (
          <div className="px-3 py-8 text-center">
            <div className="skeleton h-4 w-32 mx-auto mb-2" />
            <div className="skeleton h-4 w-24 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
