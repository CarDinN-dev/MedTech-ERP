import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18222f",
        teal: { 50: "#ecfdf8", 100: "#d1faed", 500: "#0d9488", 600: "#0f766e", 700: "#115e59" },
        coral: "#f26b5b"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.03), 0 8px 28px rgba(15,23,42,.06)",
        panel: "0 16px 40px rgba(15,23,42,.08)"
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      fontFamily: { sans: ["Inter", "Segoe UI", "Arial", "sans-serif"] }
    }
  },
  plugins: []
} satisfies Config;
