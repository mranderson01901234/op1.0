import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Linear's actual dark palette (from marketing site)
        "linear-bg": "#0a0a0a",
        "linear-sidebar": "#0d0d0d",
        "linear-surface": "#141414",
        "linear-elevated": "#1a1a1a",
        "linear-overlay": "#1f1f1f",
        "linear-hover": "#1a1a1a",
        "linear-active": "#1f1f1f",
        "linear-selected": "#232323",

        // Linear borders (very subtle)
        "linear-border-subtle": "rgba(255, 255, 255, 0.06)",
        "linear-border": "rgba(255, 255, 255, 0.08)",
        "linear-border-strong": "rgba(255, 255, 255, 0.12)",
        "linear-border-focus": "rgba(255, 255, 255, 0.16)",

        // Linear text colors
        "linear-text": "#ffffff",
        "linear-text-secondary": "#a0a0a0",
        "linear-text-tertiary": "#6e6e70",
        "linear-text-disabled": "#4e4f57",

        // Semantic color names used in components
        background: "#0a0a0a",
        surface: "#141414",
        "surface-elevated": "#1a1a1a",
        elevated: "#1a1a1a",
        "elevated-hover": "#1f1f1f",

        // Text semantic names
        "text-primary": "#ffffff",
        "text-secondary": "#a0a0a0",
        "text-muted": "#6e6e70",
        "text-timestamp": "#6e6e70",

        // Accent color
        "linear-green": "#00d084",

        gray: {
          400: "#a0a0a0",
          500: "#6e6e70",
          600: "#4e4f57",
          700: "#3a3a3a",
          800: "#2a2a2a",
          850: "#232323",
          900: "#1f1f1f",
          925: "#1a1a1a",
          950: "#141414",
          975: "#0a0a0a",
        },
      },
      backgroundImage: {
        "gradient-main": "linear-gradient(to bottom, #0a0a0a 0%, #000000 100%)",
        "gradient-sidebar": "linear-gradient(to bottom, #0f0f0f 0%, #0d0d0d 50%, #0a0a0a 100%)",
        "gradient-card": "linear-gradient(135deg, #1a1a1a 0%, #141414 100%)",
        "gradient-hover": "#1a1a1a",
        "gradient-active": "linear-gradient(135deg, #1f1f1f 0%, #1a1a1a 100%)",
        "gradient-input": "#141414",
        "gradient-radial-top": "radial-gradient(ellipse at top, rgba(255, 255, 255, 0.03) 0%, transparent 70%)",
      },
      boxShadow: {
        "linear-sm": "0 2px 8px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.03)",
        "linear-md": "0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
        "linear-lg": "0 8px 24px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
        "linear-input": "0 2px 8px rgba(0, 0, 0, 0.3)",
        "linear-input-focus": "0 0 0 3px rgba(67, 68, 76, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["Fira Code", "Courier New", "monospace"],
      },
      letterSpacing: {
        tighter: "-0.02em",
      },
      transitionTimingFunction: {
        "ease-linear": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
