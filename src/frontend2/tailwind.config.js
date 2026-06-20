/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface": "#faf5ee",
        "outline-variant": "#d8d0c8",
        "on-surface-variant": "#605850",
        "on-background": "#3a302a",
        "tertiary-container": "#d47070",
        "surface-container-high": "#ece6dc",
        "secondary-container": "#eae2da",
        "on-tertiary-fixed": "#2e1515",
        "tertiary-fixed-dim": "#e8a0a0",
        "primary": "#c2652a",
        "primary-fixed-dim": "#f0a878",
        "on-primary-fixed": "#401a08",
        "surface-dim": "#dcd6cc",
        "secondary": "#78706a",
        "surface-tint": "#c2652a",
        "on-primary": "#ffffff",
        "on-tertiary-container": "#3a2020",
        "surface-variant": "#ece6dc",
        "inverse-primary": "#f0a878",
        "inverse-on-surface": "#faf5ee",
        "on-secondary-fixed": "#2a2420",
        "on-secondary-container": "#605850",
        "primary-fixed": "#fbe8d8",
        "on-surface": "#3a302a",
        "tertiary-fixed": "#fce0e0",
        "tertiary": "#8c3c3c",
        "on-tertiary": "#ffffff",
        "on-error-container": "#7a1a10",
        "surface-container": "#f2ece4",
        "inverse-surface": "#3a302a",
        "surface-container-lowest": "#ffffff",
        "primary-container": "#e08850",
        "on-error": "#ffffff",
        "error": "#c0392b",
        "surface-container-low": "#f6f0e8",
        "on-secondary": "#ffffff",
        "error-container": "#fce4e0",
        "surface-bright": "#faf5ee",
        "background": "#faf5ee"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.8rem",
        "xl": "1rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ["EB Garamond", "serif"],
        "display": ["EB Garamond", "serif"],
        "body": ["Manrope", "sans-serif"],
        "label": ["Manrope", "sans-serif"]
      }
    },
  },
  plugins: [],
}
