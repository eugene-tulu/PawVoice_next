module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Color palette lives in src/app/globals.css: light values in :root (as
  // --pw-* source vars) and dark values in .dark, with @theme aliases
  // (--color-* : var(--pw-*)) that make Tailwind emit dynamic var()-based
  // utilities (bg-paper, text-ink, …). Using var() values means Tailwind
  // cannot bake them to static literals, so dark mode actually flips the whole
  // UI (not just hand-written .card/footer rules). Fonts/sizes/spacing stay
  // here since they don't need theme switching.
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: "0.72rem",
        sm: "0.875rem",
        base: "1rem",
        md: "1.125rem",
        lg: "1.5625rem",
        xl: "1.953rem",
        "2xl": "2.441rem",
        "3xl": "3.052rem",
        display: "clamp(2.75rem, 5vw + 1rem, 5.25rem)",
      },
      letterSpacing: {
        tighter: "-0.02em",
        tight: "-0.01em",
        normal: "0",
        wide: "0.03em",
        wider: "0.06em",
      },
    },
  },
  plugins: [],
};
