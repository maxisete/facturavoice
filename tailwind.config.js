/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#FF5C39',
        },
        void: '#0a0a0f',
        neon: {
          orange: '#FF5C39',
          cyan: '#00f5ff',
          pink: '#ff00ff',
          green: '#00ff88',
        },
        dark: {
          100: '#1a1a2e',
          200: '#16213e',
          300: '#0f3460',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        orbitron: ['Orbitron', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 10px #FF5C39, 0 0 20px #FF5C39',
        'neon-sm': '0 0 5px #FF5C39',
        'neon-cyan': '0 0 10px #00f5ff, 0 0 20px #00f5ff',
      },
    },
  },
  plugins: [],
}