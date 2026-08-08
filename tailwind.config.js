module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "oklch(96% 0.015 80)",
        paper2: "oklch(93% 0.018 80)",
        ink: "oklch(20% 0.012 60)",
        ink2: "oklch(40% 0.014 60)",
        rule: "oklch(82% 0.012 80)",
        neutral: "oklch(56% 0.008 80)",
        muted: "oklch(44% 0.010 70)",
        accent: "oklch(58% 0.16 35)",
        focus: "oklch(55% 0.20 35)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: "0.64rem",
        sm: "0.8rem",
        base: "1rem",
        md: "1.25rem",
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
}
