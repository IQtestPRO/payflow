import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./docs/**/*.md"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#001A42",
          deep: "#020B1F",
          ink: "#06245B",
          blue: "#0967FF",
          electric: "#0A84FF",
          cyan: "#16C8C7",
          green: "#3BEA8D",
          mint: "#B7FFE0",
          paper: "#F7FAFF"
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        destructive: "hsl(var(--destructive))"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Calistoga", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 10px 30px -20px rgb(15 23 42 / 0.35)",
        premium: "0 18px 50px -28px rgb(0 26 66 / 0.55)",
        glow: "0 0 0 1px rgb(22 200 199 / 0.12), 0 18px 55px -32px rgb(9 103 255 / 0.7)",
        "inner-line": "inset 0 1px 0 rgb(255 255 255 / 0.72)"
      },
      backgroundImage: {
        "payflow-mesh":
          "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(247,250,255,0.94) 42%, rgba(239,247,255,0.92) 100%)",
        "payflow-grid":
          "linear-gradient(rgba(0,26,66,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,26,66,0.045) 1px, transparent 1px)",
        "payflow-sidebar":
          "linear-gradient(180deg, #031A42 0%, #061638 48%, #020B1F 100%)",
        "payflow-accent":
          "linear-gradient(135deg, #0967FF 0%, #16C8C7 58%, #3BEA8D 100%)"
      }
    }
  },
  plugins: []
};

export default config;
