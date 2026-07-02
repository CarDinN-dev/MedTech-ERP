import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        medtech: {
          red: "#ED1E36",
          redDark: "#C9162C",
          navy: "#243168",
          deep: "#1B1F3D",
          purple: "#592C5A",
          magenta: "#B22541",
          rose: "#8B274B"
        },
        ui: {
          page: "var(--page)",
          panel: "var(--panel)",
          elevated: "var(--elevated)",
          text: "var(--text)",
          secondary: "var(--text-secondary)",
          muted: "var(--muted)",
          line: "var(--line)",
          soft: "var(--line-soft)",
          navy: "var(--navy-tint)",
          red: "var(--red-tint)"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.05)",
        panel: "0 12px 30px rgba(15,23,42,.12)",
        focus: "0 0 0 3px var(--focus-ring)"
      },
      borderRadius: { xl: "0.75rem", "2xl": "1rem" },
      fontFamily: { sans: ["Inter", "Segoe UI", "Arial", "sans-serif"] }
    }
  },
  plugins: []
} satisfies Config;
