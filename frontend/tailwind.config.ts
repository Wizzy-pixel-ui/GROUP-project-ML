import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e8eef5",
        panel: "#eef3f8",
        line: "#d5dee9",
        cyan: "#2563b8",
        muted: "#52657c",
        surface: "#eaf0f6",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "10px 10px 24px rgba(132, 153, 180, 0.20), -10px -10px 24px rgba(255, 255, 255, 0.94)",
        soft: "8px 8px 20px rgba(132, 153, 180, 0.19), -8px -8px 20px rgba(255, 255, 255, 0.9)",
        "soft-sm": "4px 4px 10px rgba(132, 153, 180, 0.18), -4px -4px 10px rgba(255, 255, 255, 0.9)",
        "inset-soft": "inset 3px 3px 7px rgba(132, 153, 180, 0.16), inset -3px -3px 7px rgba(255, 255, 255, 0.92)",
        "inset-blue": "inset 2px 2px 5px rgba(12, 57, 117, 0.4), inset -2px -2px 5px rgba(106, 173, 255, 0.3)",
        blue: "0 5px 14px rgba(37, 99, 184, 0.23)",
        "blue-lg": "0 10px 22px rgba(37, 99, 184, 0.30)",
      },
    },
  },
  plugins: [],
} satisfies Config;
