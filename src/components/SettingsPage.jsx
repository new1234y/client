import { useTheme } from "../context/ThemeContext.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BrandMark from "./ui/BrandMark.jsx";
import AdminPanel from "./game/AdminPanel.jsx";
import {
  ACCENTS,
  applyAccentClass,
  applyReducedMotionClass,
  getAccent,
  getHighContrast,
  getReducedMotion,
  setAccent,
  setHighContrast,
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

function Section({ title, hint, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
      <h2 className="text-sm font-black tracking-tight">{title}</h2>
      {hint ? (
        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function SettingsPage({
  embedded = false,
  inGame = false,
  nickname: nicknameProp,
  onLeaveGame,
  admin = null,
}) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [highContrast, setHc] = useState(() => getHighContrast());
  const [accent, setAccentState] = useState(() => getAccent());
  const [reduceMotion, setReduce] = useState(() => getReducedMotion());
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === "undefined" ? "fallback" : Notification.permission
  );
  const hasNotificationApi = typeof Notification !== "undefined";
  const hasServiceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const storedNick = nicknameProp ?? readNickname();
  const isKarim = (storedNick || "").trim().toLowerCase() === "karim";
  const showAdmin = Boolean(inGame && isKarim && admin);
  const appearance = highContrast ? "contrast" : theme === "dark" ? "dark" : "light";

  useEffect(() => {
    applyAccentClass(accent);
  }, [accent]);

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

  const handleMotion = (on) => {
    setReduce(on);
    setReducedMotion(on);
    applyReducedMotionClass(on);
  };

  const requestNotifications = async () => {
    if (!hasNotificationApi) {
      setNotificationPermission(hasServiceWorker ? "fallback" : "unsupported");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      setNotificationPermission("denied");
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const body = (
    <>
      <Section title="Compte" hint="Pseudo enregistré sur cet appareil.">
        <div className="rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-900">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pseudo</p>
          <p className="mt-0.5 truncate font-black text-slate-950 dark:text-white">{storedNick || "—"}</p>
        </div>
      </Section>

      <Section title="Apparence" hint="Thème, accent et mouvement.">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "light", label: "Clair", icon: "sun" },
            { id: "dark", label: "Sombre", icon: "moon" },
            { id: "contrast", label: "Contraste", icon: "contrast" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleAppearance(opt.id)}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center ${
                appearance === opt.id
                  ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <span className="text-slate-700 dark:text-slate-200">
                <ThemeIcon name={opt.icon} />
              </span>
              <span className="text-xs font-black">{opt.label}</span>
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Accent</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.values(ACCENTS).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleAccent(a.id)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  accent === a.id
                    ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-800" style={{ background: a.swatch }} />
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <span>
            <span className="block text-sm font-bold">Réduire les animations</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Suit aussi le réglage système</span>
          </span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => handleMotion(e.target.checked)}
            className="h-5 w-5 accent-blue-600"
          />
        </label>
      </Section>

      <Section
        title="Notifications"
        hint="Recevez les alertes importantes quand le jeu passe en arrière-plan."
      >
        {notificationPermission === "granted" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            Notifications autorisées sur cet appareil.
          </div>
        ) : notificationPermission === "denied" ? (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-bold">Notifications bloquées</p>
            <p className="text-xs font-semibold">
              Le navigateur les a refusées. Autorisez-les dans les réglages du site ou du navigateur, puis réessayez.
            </p>
            <button
              type="button"
              onClick={requestNotifications}
              className="min-h-10 rounded-full border border-amber-300 px-4 py-2 text-xs font-black hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
            >
              Vérifier l’autorisation
            </button>
          </div>
        ) : notificationPermission === "fallback" ? (
          <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            <p className="font-bold">Mode compatible activé</p>
            <p className="text-xs font-semibold">
              Ce navigateur ne propose pas la permission classique, mais l’application utilise ses notifications PWA quand elles sont disponibles. Gardez le jeu installé sur l’écran d’accueil pour une meilleure réception.
            </p>
          </div>
        ) : notificationPermission === "unsupported" ? (
          <p className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            Les notifications en arrière-plan ne sont pas disponibles sur cet ancien navigateur. Les alertes intégrées au jeu restent actives.
          </p>
        ) : (
          <button
            type="button"
            onClick={requestNotifications}
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-sm font-black text-blue-800 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50"
          >
            <span>Autoriser les notifications</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </Section>

      {inGame && (
        <Section title="Partie">
          {showAdmin && (
            <AdminPanel
              embedded
              roomCode={admin.roomCode}
              rosterList={admin.rosterList}
              sessionId={admin.sessionId}
              onEndGame={admin.onEndGame}
              onAddTime={admin.onAddTime}
              onAdjustCoins={admin.onAdjustCoins}
              onSetRole={admin.onSetRole}
              onKick={admin.onKick}
            />
          )}
          {onLeaveGame && (
            <button
              type="button"
              onClick={onLeaveGame}
              className="min-h-11 w-full rounded-full border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
            >
              Quitter la partie
            </button>
          )}
        </Section>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="h-full overflow-auto bg-white px-4 pb-28 pt-4 text-slate-950 [scrollbar-width:none] dark:bg-slate-950 dark:text-white [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto max-w-lg space-y-3">
          <h1 className="text-xl font-black tracking-tight">Paramètres</h1>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-950 landing-dots dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-2xl space-y-3 px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
        {body}
      </div>
    </div>
  );
}
