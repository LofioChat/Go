/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark:    "#0f172a",
        },
        msg: {
          out:      "#2563eb",
          "out-text": "#ffffff",
          in:       "#f1f5f9",
          "in-text": "#0f172a",
          "out-dark": "#1d4ed8",
          "in-dark":  "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "slide-up":      "slideUp 0.3s ease-out",
        "slide-down":    "slideDown 0.3s ease-out",
        "fade-in":       "fadeIn 0.2s ease-out",
        "bounce-dot":    "bounceDot 1.4s infinite ease-in-out",
        "pulse-ring":    "pulseRing 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite",
        "shimmer":       "shimmer 1.5s infinite",
        "story-progress":"storyProgress var(--duration,5s) linear forwards",
      },
      keyframes: {
        slideUp:       { from: { transform: "translateY(100%)", opacity: 0 }, to: { transform: "translateY(0)", opacity: 1 } },
        slideDown:     { from: { transform: "translateY(-100%)", opacity: 0 }, to: { transform: "translateY(0)", opacity: 1 } },
        fadeIn:        { from: { opacity: 0 }, to: { opacity: 1 } },
        bounceDot:     { "0%,80%,100%": { transform: "scale(0)" }, "40%": { transform: "scale(1)" } },
        pulseRing:     { "0%": { transform: "scale(0.33)" }, "80%,100%": { opacity: 0 } },
        shimmer:       { "100%": { transform: "translateX(100%)" } },
        storyProgress: { from: { width: "0%" }, to: { width: "100%" } },
      },
      screens: {
        xs: "375px",
      },
      spacing: {
        "safe-top":    "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};
