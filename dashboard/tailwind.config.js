/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Digiclip Clean White, Black, and Blue #0000fb Brand Palette
        paper: "var(--color-paper)",
        paper2: "var(--color-paper-2)",
        paper3: "var(--color-paper-3)",
        ink: "var(--color-ink)",
        ink2: "var(--color-ink-2)",
        muted: "var(--color-muted)",
        brass: "#0000fb",
        brassink: "#ffffff",
        coral: "#0000fb",
        brand: "#0000fb",
        brandHover: "#1a1afc",
        ok: "var(--color-ok)",
        warn: "var(--color-warn)",
        danger: "var(--color-danger)",
        // Aliases for clean user-friendly styling
        background: "var(--color-paper)",
        surface: "var(--color-paper-2)",
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
        micro: ["10.5px", { letterSpacing: "0.10em" }],
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade': 'fadeIn 0.4s var(--ease-out)',
        // mobile shell: the nav drawer flies in from the edge, sheets rise
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
