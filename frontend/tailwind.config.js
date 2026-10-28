/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',
        'paper-inset': 'rgb(var(--c-inset) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-soft) / <alpha-value>)',
        rule: 'rgb(var(--c-rule) / <alpha-value>)',
        loss: 'rgb(var(--c-loss) / <alpha-value>)',
        gain: 'rgb(var(--c-gain) / <alpha-value>)',
        brass: 'rgb(var(--c-brass) / <alpha-value>)',
        'brass-soft': 'rgb(var(--c-bs) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        desk: '840px',
      },
    },
  },
  plugins: [],
}
