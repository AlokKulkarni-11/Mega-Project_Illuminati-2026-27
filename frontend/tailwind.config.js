/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#E7E9DE',
        'paper-inset': '#FAFAF7',
        ink: '#1B2B22',
        'ink-soft': '#4B5A50',
        rule: '#C6CBBC',
        loss: '#8B2E1F',
        gain: '#1F4E3D',
        brass: '#A8823C',
        'brass-soft': '#E9DCC1',
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
