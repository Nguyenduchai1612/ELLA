import { Inter, Playfair_Display } from "next/font/google";

// Loaded once, exposed as CSS variables consumed by tailwind.config.ts.
// Both are variable fonts so we only pay for one file per family.
export const fontSans = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const fontSerif = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-serif",
  display: "swap",
});
