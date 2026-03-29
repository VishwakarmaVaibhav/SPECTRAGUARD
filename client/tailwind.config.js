/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "sg-black": "#0a0a0a",
        "sg-panel": "#1a1a1a",
        "sg-card": "#222222",
        "sg-border": "#333333",
        "sg-red": "#ff0000",
        "sg-green": "#00ff41",
        "sg-amber": "#ffbf00",
        "sg-text": "#e0e0e0",
        "sg-muted": "#888888",
      },
      fontFamily: {
        mono: ['"Roboto Mono"', "Courier New", "monospace"],
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0px",
      },
    },
  },
  plugins: [],
};
