import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17171a",
        paper: "#f7f6f2",
        line: "#d8d6cf",
        moss: "#60715d",
        ember: "#b94d35",
        steel: "#4f6f8f"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(23, 23, 26, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

