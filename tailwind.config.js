/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'vibrant-blue': '#3B82F6',
        'vibrant-blue-dark': '#2563EB',
        'vibrant-green': '#10B981',
        'vibrant-gold': '#F59E0B',
        'vibrant-pink': '#EC4899',
        'vibrant-purple': '#8B5CF6',
        'vibrant-orange': '#F97316',
        'matte-blue': '#5B7FA5',
        'matte-yellow': '#E2C96D',
        'matte-red': '#C45454',
        'matte-white': '#FAFAFA',
        'matte-bg': '#F5F5F5',
        'primary-blue': '#3B82F6',
        'primary-yellow': '#F59E0B',
        'primary-red': '#EF4444',
        'bg-white': '#FFFFFF',
        'bg-light': '#F8FAFC',
        'text-dark': '#1E293B',
        'text-light': '#64748B',
        'border-light': '#E2E8F0',
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
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ping-slow': {
          '0%': { transform: 'scale(1)', opacity: '0.5' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'sweep': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'squish': 'squish 0.15s ease-in-out',
        'particle-burst': 'particle-burst 0.5s ease-out forwards',
        'particle-orbit': 'particle-orbit 3s linear infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'ping-slow': 'ping-slow 3s cubic-bezier(0,0,0.2,1) infinite',
        'sweep': 'sweep 6s linear infinite',
      },
      transformStyle: {
        'preserve-3d': 'preserve-3d',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      perspective: {
        '1000': '1000px',
      },
      rotateY: {
        '180': '180deg',
      },
    },
  },
  plugins: [],
};
