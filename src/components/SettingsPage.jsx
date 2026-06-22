import { useTheme } from "../context/ThemeContext.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState(theme);

  const handleThemeChange = (newTheme) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-2xl px-2 py-2">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Paramètres</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Personnalisez votre expérience
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-slate-700"
          >
            Retour
          </button>
        </div>

        {/* Theme Selection */}
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Thème</h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Choisissez le thème qui vous convient
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Light Mode */}
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`relative overflow-hidden rounded-2xl border-2 p-4 transition-all ${
                selectedTheme === "light"
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg">
                  <span className="text-2xl">☀️</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900 dark:text-white">Mode clair</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Thème par défaut
                  </p>
                </div>
              </div>
              {selectedTheme === "light" && (
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Dark Mode */}
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`relative overflow-hidden rounded-2xl border-2 p-4 transition-all ${
                selectedTheme === "dark"
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg">
                  <span className="text-2xl">🌙</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900 dark:text-white">Mode sombre</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                Pour les yeux fatigués
                  </p>
                </div>
              </div>
              {selectedTheme === "dark" && (
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="mt-6 rounded-2xl bg-slate-100 p-6 dark:bg-slate-800">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            À venir
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Plus d'options de personnalisation seront bientôt disponibles.
          </p>
        </div>
      </div>
    </div>
  );
}
