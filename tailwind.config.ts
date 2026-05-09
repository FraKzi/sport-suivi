import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d10",
        surface: "#14171c",
        surface2: "#1c2026",
        border: "#272c34",
        text: "#e6e8eb",
        muted: "#8b91a0",
        accent: "#5b8def",
        success: "#3fb37f",
        warning: "#e0a64a",
        danger: "#e0644a",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
