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
    },
  },
  plugins: [],
};

export default config;
