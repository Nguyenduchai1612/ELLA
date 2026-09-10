import type { Config } from "tailwindcss";

/**
 * ELLA design tokens.
 *
 * Direction: elegant, feminine, modern, minimal, premium, editorial. Warm
 * neutral base with a single restrained accent (dusty rose) rather than a
 * loud multi-color palette — product photography is meant to carry the
 * visual weight, not UI chrome.
 *
 * ASSUMPTION: no brand color/logo assets were provided, so this palette is
 * a reasonable default within the spec's stated direction. Swap the `rose`
 * scale below if ELLA has established brand colors.
 */
const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "375px",
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
      colors: {
        // Warm neutral scale — replaces default gray for a softer feel.
        neutral: {
          50: "#FAF8F6",
          100: "#F3EFEB",
          200: "#E7E0D9",
          300: "#D3C7BC",
          400: "#B3A296",
          500: "#8C7A6E",
          600: "#6B5C52",
          700: "#4F433C",
          800: "#332B26",
          900: "#211B17",
          950: "#161210",
        },
        // Primary accent: dusty rose. Used sparingly — CTAs, active states,
        // sale price emphasis — never as a background flood.
        rose: {
          50: "#FBF2F0",
          100: "#F6E2DD",
          200: "#EBC3B9",
          300: "#DEA090",
          400: "#CD7C67",
          500: "#B85F49",
          600: "#9C4B38",
          700: "#7D3B2C",
          800: "#5F2C21",
          900: "#452019",
        },
        success: { 50: "#F0F7F0", 500: "#4B7C4E", 700: "#365938" },
        error: { 50: "#FBF0EF", 500: "#B8493F", 700: "#8A362E" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      letterSpacing: {
        widest: ".2em",
      },
      maxWidth: {
        "8xl": "88rem",
      },
    },
  },
  plugins: [],
};

export default config;
