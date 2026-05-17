/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'matte-blue': '#5B7FA5',
        'matte-yellow': '#E2C96D',
        'matte-red': '#C45454',
        'matte-white': '#FAFAFA',
        'matte-bg': '#F5F5F5',
        'primary-blue': '#5B7FA5',
        'primary-yellow': '#E2C96D',
        'primary-red': '#C45454',
        'bg-white': '#FAFAFA',
        'bg-light': '#F5F5F5',
        'text-dark': '#2C3E50',
        'text-light': '#5A6C7D',
        'border-light': '#E0E6ED',
        'accent-orange': '#FFB366',
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        'custom': '8px',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'squish': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95, 0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        'particle-burst': {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.8' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        'particle-orbit': {
          '0%': { transform: 'rotate(0deg) translateX(32px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(32px) rotate(-360deg)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'squish': 'squish 0.15s ease-in-out',
        'particle-burst': 'particle-burst 0.5s ease-out forwards',
        'particle-orbit': 'particle-orbit 3s linear infinite',
      },
    },
  },
  plugins: [],
};
