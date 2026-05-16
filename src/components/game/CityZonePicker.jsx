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
  <div className="mt-3 space-y-3 rounded-lg border border-cozy-border bg-cozy-surface p-3 ">
   <p className="text-xs font-semibold uppercase tracking-wide text-cozy-text-muted">
    Zone de jeu
   </p>
   <div className="flex gap-2">
    <button
     type="button"
     onClick={() => onZoneModeChange("circle")}
     className={`flex-1 rounded-lg py-2 text-xs font-bold ${
      zoneMode === "circle"
       ? "bg-cozy-primary text-cozy-bg"
       : "bg-cozy-bg text-cozy-text-secondary ring-1 ring-cozy-border bg-cozy-surface"
     }`}
    >
     Cercle
    </button>
    <button
     type="button"
     onClick={() => onZoneModeChange("city")}
     className={`flex-1 rounded-lg py-2 text-xs font-bold ${
      zoneMode === "city"
       ? "bg-cozy-primary text-cozy-bg"
       : "bg-cozy-bg text-cozy-text-secondary ring-1 ring-cozy-border bg-cozy-surface"
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
     <p className="text-xs text-cozy-text-secondary">
      Union des contours sélectionnés. Hors de ces zones, la position est
      affichée précisément pour les chats.
     </p>
     <div className="flex flex-wrap gap-2">
      <button
       type="button"
       disabled={loading}
       onClick={loadNear}
       className="rounded-lg bg-cozy-bg px-3 py-2 text-xs font-semibold text-cozy-primary ring-1 ring-cozy-primary/20 disabled:opacity-50 bg-cozy-surface"
      >
       {loading ? "…" : "5 villes proches"}
      </button>
     </div>
     <div className="flex gap-2">
      <input
       className="min-w-0 flex-1 rounded-lg border border-cozy-border bg-cozy-bg px-3 py-2 text-sm"
       placeholder="Ajouter une ville…"
       value={manualQuery}
       onChange={(e) => setManualQuery(e.target.value)}
      />
      <button
       type="button"
       disabled={loading}
       onClick={searchManual}
       className="shrink-0 rounded-lg bg-cozy-surface px-3 py-2 text-xs font-semibold text-cozy-bg"
      >
       Chercher
      </button>
     </div>
     {error && (
      <p className="text-xs text-cozy-yellow">{error}</p>
     )}
     {suggestions.length > 0 && (
      <ul className="max-h-40 space-y-1 overflow-auto text-xs">
       {suggestions.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-2">
         <span className="truncate text-cozy-text-secondary">
          {s.name}
         </span>
         <button
          type="button"
          className="shrink-0 rounded-md bg-cozy-success px-2 py-1 font-semibold text-cozy-bg"
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
       <p className="text-xs font-medium text-cozy-text-muted">Zones actives</p>
       {(selectedRings || []).map((ring, idx) => (
        <div
         key={idx}
         className="flex items-center justify-between rounded-lg bg-cozy-bg px-2 py-1.5 text-xs bg-cozy-surface"
        >
         <span className="text-cozy-text-secondary">
          Polygone {idx + 1} ({ring.length} pts)
         </span>
         <button
          type="button"
          className="font-semibold text-cozy-red"
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
