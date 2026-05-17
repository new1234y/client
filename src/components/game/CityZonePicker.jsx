import { useCallback, useState } from "react";
import {
  nominatimSearchCitiesNear,
  nominatimSearchCityByName,
} from "../../lib/nominatim.js";
import ConfigHint from "../ui/ConfigHint.jsx";

export default function CityZonePicker({
  position,
  selectedRings,
  onChangeRings,
  zoneMode,
  onZoneModeChange,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [manualQuery, setManualQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNear = useCallback(async () => {
    if (!position?.lat || !position?.lng) {
      setError("Position GPS requise pour proposer des villes.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await nominatimSearchCitiesNear(
        position.lat,
        position.lng,
        5
      );
      setSuggestions(rows.filter((r) => r.rings?.length));
      if (!rows.filter((r) => r.rings?.length).length) {
        setError("Aucun contour trouvé. Essayez une recherche manuelle.");
      }
    } catch (e) {
      setError(e?.message || "Impossible de contacter Nominatim.");
    } finally {
      setLoading(false);
    }
  }, [position]);

  const searchManual = useCallback(async () => {
    if (!manualQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await nominatimSearchCityByName(manualQuery.trim(), 8);
      setSuggestions(rows.filter((r) => r.rings?.length));
      if (!rows.filter((r) => r.rings?.length).length) {
        setError("Aucun résultat avec contour pour cette recherche.");
      }
    } catch (e) {
      setError(e?.message || "Recherche impossible.");
    } finally {
      setLoading(false);
    }
  }, [manualQuery]);

  const addRings = (rings) => {
    const merged = [...(selectedRings || []), ...rings];
    onChangeRings(merged);
  };

  const removeRingAt = (idx) => {
    const next = [...(selectedRings || [])];
    next.splice(idx, 1);
    onChangeRings(next);
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Zone de jeu
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onZoneModeChange("circle")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold ${
            zoneMode === "circle"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
          }`}
        >
          Cercle
        </button>
        <button
          type="button"
          onClick={() => onZoneModeChange("city")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold ${
            zoneMode === "city"
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
          }`}
        >
          Villes (contours)
        </button>
      </div>
      <ConfigHint>
        Cercle : une zone ronde centrée sur la partie. Villes : périmètres réels (OpenStreetMap) pour limiter le jeu
        aux contours choisis.
      </ConfigHint>

      {zoneMode === "city" && (
        <>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Union des contours sélectionnés. Hors de ces zones, la position est
            affichée précisément pour les chats.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={loadNear}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 disabled:opacity-50 dark:bg-slate-800 dark:text-indigo-300 dark:ring-indigo-900"
            >
              {loading ? "…" : "5 villes proches"}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              placeholder="Ajouter une ville…"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
            />
            <button
              type="button"
              disabled={loading}
              onClick={searchManual}
              className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white dark:bg-slate-600"
            >
              Chercher
            </button>
          </div>
          {error && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{error}</p>
          )}
          {suggestions.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-auto text-xs">
              {suggestions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {s.name}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white"
                    onClick={() => addRings(s.rings)}
                  >
                    + zone
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(selectedRings || []).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500">Zones actives</p>
              {(selectedRings || []).map((ring, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs dark:bg-slate-800"
                >
                  <span className="text-slate-600 dark:text-slate-300">
                    Polygone {idx + 1} ({ring.length} pts)
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-red-600"
                    onClick={() => removeRingAt(idx)}
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
