import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import type { Veda, Division, Subdivision, Verse } from "../../types";
import VedaTree from "./VedaTree";
import SuktaView from "./SuktaView";

export default function BrowseView() {
  const { vedaId, divisionId, subdivisionId } = useParams();
  const [vedas, setVedas] = useState<Veda[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [selectedSubdivision, setSelectedSubdivision] = useState<Subdivision | null>(null);

  useEffect(() => {
    invoke<Veda[]>("get_vedas").then(setVedas).catch(console.error);
  }, []);

  useEffect(() => {
    if (vedaId) {
      invoke<Division[]>("get_divisions", { vedaId: Number(vedaId) })
        .then(setDivisions)
        .catch(console.error);
    }
  }, [vedaId]);

  useEffect(() => {
    if (divisionId) {
      invoke<Subdivision[]>("get_subdivisions", { divisionId: Number(divisionId) })
        .then(setSubdivisions)
        .catch(console.error);
    }
  }, [divisionId]);

  useEffect(() => {
    if (subdivisionId) {
      invoke<Verse[]>("get_verses", { subdivisionId: Number(subdivisionId) })
        .then(setVerses)
        .catch(console.error);
      const sub = subdivisions.find((s) => s.id === Number(subdivisionId));
      if (sub) setSelectedSubdivision(sub);
    }
  }, [subdivisionId, subdivisions]);

  return (
    <div className="flex gap-6 h-full">
      <div className="w-72 shrink-0 overflow-y-auto">
        <VedaTree
          vedas={vedas}
          divisions={divisions}
          subdivisions={subdivisions}
          selectedVedaId={vedaId ? Number(vedaId) : undefined}
          selectedDivisionId={divisionId ? Number(divisionId) : undefined}
          selectedSubdivisionId={subdivisionId ? Number(subdivisionId) : undefined}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {verses.length > 0 && selectedSubdivision ? (
          <SuktaView subdivision={selectedSubdivision} verses={verses} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-fade-in">
            <div className="text-6xl mb-4 opacity-30">श्रुति</div>
            <p className="text-sm">Select a sukta or prapathaka to view its verses</p>
          </div>
        )}
      </div>
    </div>
  );
}
