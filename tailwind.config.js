/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        cozy: {
          bg: "rgb(var(--color-bg) / <alpha-value>)",
          surface: "rgb(var(--color-surface) / <alpha-value>)",
          border: "rgb(var(--color-border) / <alpha-value>)",
          text: "rgb(var(--color-text) / <alpha-value>)",
          "text-secondary": "rgb(var(--color-text-secondary) / <alpha-value>)",
          "text-muted": "rgb(var(--color-text-muted) / <alpha-value>)",
          primary: "rgb(var(--color-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--color-primary-hover) / <alpha-value>)",
          "primary-muted": "rgb(var(--color-primary-muted) / <alpha-value>)",
          yellow: "rgb(var(--color-yellow) / <alpha-value>)",
          "yellow-muted": "rgb(var(--color-yellow-muted) / <alpha-value>)",
          red: "rgb(var(--color-red) / <alpha-value>)",
          "red-muted": "rgb(var(--color-red-muted) / <alpha-value>)",
          cat: "rgb(var(--color-cat) / <alpha-value>)",
          "cat-muted": "rgb(var(--color-cat-muted) / <alpha-value>)",
          player: "rgb(var(--color-player) / <alpha-value>)",
          "player-muted": "rgb(var(--color-player-muted) / <alpha-value>)",
          success: "rgb(var(--color-success) / <alpha-value>)",
          "success-muted": "rgb(var(--color-success-muted) / <alpha-value>)",
        },
      },
      borderRadius: {
        cozy: "0.5rem",
      },
    },
  },
  plugins: [],
};
