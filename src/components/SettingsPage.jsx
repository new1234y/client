import { useTheme } from "../context/ThemeContext.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BrandMark from "./ui/BrandMark.jsx";
import { getOsmApiKey, setOsmApiKey } from "../lib/map/osmKey.js";
import { getMapboxToken, setMapboxToken } from "../lib/map/mapboxKey.js";
import {
  ACCENTS,
  MAPBOX_STYLES,
  MAP_3D_MODES,
  applyAccentClass,
  applyReducedMotionClass,
  getAccent,
  getCompassMode,
  getHighContrast,
  getMap3dMode,
  getMapGyro,
  getMapStyleId,
  getReducedMotion,
  setAccent,
  setCompassMode,
  setHighContrast,
  setMap3dMode,
  setMapGyro,
  setMapStyleId,
  setReducedMotion,
} from "../lib/map/mapPrefs.js";

function ThemeIcon({ name }) {
  if (name === "sun") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (name === "contrast") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18" />
        <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z" />
    </svg>
  );
}

function readNickname() {
  try {
    return (
      window.localStorage.getItem("chase_gps_nickname") ||
      window.localStorage.getItem("chase_gps_last_nickname") ||
      ""
    );
  } catch {
    return "";
  }
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [highContrast, setHc] = useState(() => getHighContrast());
  const [accent, setAccentState] = useState(() => getAccent());
  const [osmKey, setOsmKey] = useState(() => getOsmApiKey());
  const [mapboxKey, setMapboxKey] = useState(() => getMapboxToken());
  const [styleId, setStyleState] = useState(() => getMapStyleId(theme === "dark" ? "dark" : "light"));
  const [mode3d, setMode3d] = useState(() => getMap3dMode());
  const [gyro, setGyroState] = useState(() => getMapGyro());
  const [compass, setCompass] = useState(() => getCompassMode());
  const [reduceMotion, setReduce] = useState(() => getReducedMotion());
  const [saved, setSaved] = useState("");
  const nickname = readNickname();
  const appearance = highContrast ? "contrast" : theme === "dark" ? "dark" : "light";

  useEffect(() => {
    applyAccentClass(accent);
  }, [accent]);

  const flash = (msg) => {
    setSaved(msg);
    window.setTimeout(() => setSaved(""), 1800);
  };

  const handleAppearance = (next) => {
    if (next === "contrast") {
      setHc(true);
      setHighContrast(true);
      setTheme("dark");
    } else {
      setHc(false);
      setHighContrast(false);
      setTheme(next);
    }
    applyAccentClass(accent);
  };

  const handleAccent = (next) => {
    setAccentState(next);
    setAccent(next);
    applyAccentClass(next);
  };

  const handleSaveKeys = () => {
    setMapboxToken(mapboxKey);
    setOsmApiKey(osmKey);
    setMapboxKey(getMapboxToken());
    setOsmKey(getOsmApiKey());
    flash("Clés enregistrées");
  };

  const handleStyle = (id) => {
    setStyleState(id);
    setMapStyleId(id);
  };

  const handle3d = (id) => {
    setMode3d(id);
    setMap3dMode(id);
  };

  const handleGyro = (on) => {
    setGyroState(on);
    setMapGyro(on);
  };

  const handleCompass = (mode) => {
    setCompass(mode);
    setCompassMode(mode);
  };

  const handleMotion = (on) => {
    setReduce(on);
    setReducedMotion(on);
    applyReducedMotionClass(on);
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-950 landing-dots dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-2xl px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <BrandMark />
            <h1 className="mt-4 text-3xl font-black tracking-tight">Paramètres</h1>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Retour
          </button>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-lg font-black">Apparence</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Clair, sombre, ou contraste élevé.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleAppearance("light")}
              className={`flex min-h-11 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                appearance === "light"
                  ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                <ThemeIcon name="sun" />
              </span>
              <span>
                <span className="block font-black">Clair</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Par défaut</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAppearance("dark")}
              className={`flex min-h-11 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                appearance === "dark"
                  ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-900 text-white dark:border-slate-600">
                <ThemeIcon name="moon" />
              </span>
              <span>
                <span className="block font-black">Sombre</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Moins de fatigue</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAppearance("contrast")}
              className={`flex min-h-11 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                appearance === "contrast"
                  ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <ThemeIcon name="contrast" />
              </span>
              <span>
                <span className="block font-black">Contraste élevé</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {appearance === "contrast" ? "Activé" : "Optionnel"}
                </span>
              </span>
            </button>
          </div>

          <p className="mt-5 text-sm font-bold">Couleur d’accent</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.values(ACCENTS).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleAccent(a.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold ${
                  accent === a.id
                    ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <span className="h-4 w-4 rounded-full ring-2 ring-white dark:ring-slate-800" style={{ background: a.swatch }} />
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-lg font-black">Carte</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Jeton Mapbox recommandé. Sans jeton, la carte utilise OpenStreetMap public — jamais de filigrane Carto.
          </p>

          <label htmlFor="mapbox-token" className="mt-4 block text-sm font-bold">
            Jeton Mapbox
          </label>
          <input
            id="mapbox-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={mapboxKey}
            onChange={(e) => {
              setMapboxKey(e.target.value);
              setSaved("");
            }}
            className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="pk.…"
          />

          <label htmlFor="osm-api-key" className="mt-4 block text-sm font-bold">
            Clé OSM / Carto <span className="font-semibold text-slate-500 dark:text-slate-400">(repli)</span>
          </label>
          <input
            id="osm-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={osmKey}
            onChange={(e) => {
              setOsmKey(e.target.value);
              setSaved("");
            }}
            className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="Optionnel si Mapbox est renseigné"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveKeys}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Enregistrer
            </button>
            {saved && (
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{saved}</span>
            )}
          </div>

          <p className="mt-6 text-sm font-bold">Style</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Suit le thème de l’interface tant que vous n’en choisissez pas un.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(MAPBOX_STYLES).map(([id, s]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleStyle(id)}
                className={`min-h-11 rounded-2xl border-2 px-3 py-2.5 text-sm font-bold ${
                  styleId === id
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <p className="mt-6 text-sm font-bold">Relief</p>
          <div className="mt-2 grid gap-2">
            {Object.values(MAP_3D_MODES).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handle3d(m.id)}
                className={`min-h-11 rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold ${
                  mode3d === m.id
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {m.name}
                <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {m.id === "2d" && "Vue à plat, sans relief"}
                  {m.id === "3d_free" && "Bâtiments et terrain — vous pouvez incliner et tourner"}
                  {m.id === "3d_lock" && "Même rendu 3D, inclinaison et cap verrouillés"}
                </span>
              </button>
            ))}
          </div>

          <label className="mt-5 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <span>
              <span className="block font-bold">Gyroscopique</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Oriente la carte selon le téléphone</span>
            </span>
            <input
              type="checkbox"
              checked={gyro}
              onChange={(e) => handleGyro(e.target.checked)}
              className="h-5 w-5 accent-blue-600"
            />
          </label>

          <p className="mt-5 text-sm font-bold">Boussole</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleCompass("north")}
              className={`min-h-11 rounded-2xl border-2 px-3 py-2.5 text-sm font-bold ${
                compass === "north"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              Nord en haut
            </button>
            <button
              type="button"
              onClick={() => handleCompass("heading")}
              className={`min-h-11 rounded-2xl border-2 px-3 py-2.5 text-sm font-bold ${
                compass === "heading"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200"
                  : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              Cap du téléphone
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-lg font-black">Mouvement</h2>
          <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <span>
              <span className="block font-bold">Réduire les animations</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Respecte aussi le réglage système « réduire les mouvements »
              </span>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => handleMotion(e.target.checked)}
              className="h-5 w-5 accent-blue-600"
            />
          </label>
        </div>

        <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950">
          <h2 className="text-lg font-black">Compte</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pseudo enregistré sur cet appareil.</p>
          <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pseudo</p>
            <p className="mt-1 font-black text-slate-950 dark:text-white">{nickname || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
