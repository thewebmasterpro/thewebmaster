import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";

// =============================================================================
// FONT CONFIGURATION
// Change fonts here — they'll apply everywhere automatically
// =============================================================================

// Primary font (body text, UI)
export const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Monospace font (code blocks, technical content)
export const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display font (hero headings, accents)
export const fontDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// =============================================================================
// CSS VARIABLES (use in Tailwind or CSS)
// =============================================================================
// --font-sans    → font-family: var(--font-sans)
// --font-mono    → font-family: var(--font-mono)
// --font-display → font-family: var(--font-display)

// Export all font variables for layout.tsx
export const fontVariables = `${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable}`;
