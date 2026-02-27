import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(210 20% 98%)",
        foreground: "hsl(222 47% 11%)",
        card: "hsl(0 0% 100%)",
        cardForeground: "hsl(222 47% 11%)",
        border: "hsl(214 32% 91%)",
        muted: "hsl(210 40% 96%)",
        mutedForeground: "hsl(215 16% 47%)",
        primary: "hsl(221 83% 53%)",
        primaryForeground: "hsl(0 0% 100%)",
        secondary: "hsl(215 25% 27%)",
        secondaryForeground: "hsl(0 0% 100%)",
        accent: "hsl(210 40% 94%)",
        accentForeground: "hsl(222 47% 11%)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
