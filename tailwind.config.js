/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
        },
        void: 'var(--color-void)',
        neon: {
          orange: 'var(--color-orange)',
          cyan: 'var(--color-cyan)',
          pink: 'var(--color-pink)',
          green: 'var(--color-green)',
        },
        dark: {
          100: 'var(--color-dark-100)',
          200: 'var(--color-dark-200)',
          300: 'var(--color-dark-300)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        orbitron: ['var(--font-display)', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 10px var(--color-orange), 0 0 20px var(--color-orange)',
        'neon-sm': '0 0 5px var(--color-orange)',
        'neon-cyan': '0 0 10px var(--color-cyan), 0 0 20px var(--color-cyan)',
      },
    },
  },
  plugins: [],
}