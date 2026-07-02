import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--text)",
        medtech: {
          red: "#ED1E36",
          redDark: "var(--brand-red-hover)",
          navy: "var(--corporate-navy)",
          deep: "var(--deep-navy)",
          purple: "var(--purple)",
          magenta: "var(--magenta)",
          rose: "var(--dark-rose)"
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
        soft: "var(--surface-glow)",
        panel: "var(--shell-shadow), var(--surface-glow)",
        focus: "0 0 0 3px var(--focus-ring)"
      },
      borderRadius: { xl: "0.75rem", "2xl": "1rem" },
      fontFamily: { sans: ["Inter", "Segoe UI", "Arial", "sans-serif"] }
    }
  },
  plugins: []
} satisfies Config;
