/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Digiclip Apple HIG Light Theme: White, Black, and Blue #0000fb Brand Palette
        paper: "#f5f5f7",
        paper2: "#ffffff",
        paper3: "#f2f2f7",
        ink: "#1d1d1f",
        ink2: "#1d1d1f",
        muted: "#52525b",
        brass: "#0000fb",
        brassink: "#ffffff",
        coral: "#0000fb",
        brand: "#0000fb",
        brandHover: "#0000d6",
        ok: "#10b981",
        warn: "#0000fb",
        danger: "#ef4444",
        // Semantic aliases
        background: "#f5f5f7",
        surface: "#ffffff",
        primary: "#0000fb",
        accent: "#0000fb",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        sans: "var(--font-body)",
        serif: "var(--font-display)",
        mono: "var(--font-mono)",
      },
      borderColor: {
        rule: "var(--color-rule)",
        rule2: "var(--color-rule-2)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        input: "var(--radius-input)",
      },
      fontSize: {
        micro: ["11px", { letterSpacing: "0.06em" }],
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade': 'fadeIn 0.3s var(--ease-out)',
        'slide-in-left': 'slideInLeft 0.24s var(--ease-out)',
        'sheet-up': 'sheetUp 0.26s var(--ease-out)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        sheetUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
