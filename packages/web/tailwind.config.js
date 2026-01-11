/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bose: {
          50: '#f5f5f5',
          100: '#e9e9e9',
          200: '#d4d4d4',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6b6b6b',
          600: '#5a5a5a',
          700: '#4a4a4a',
          800: '#3d3d3d',
          900: '#1a1a1a',
          950: '#0d0d0d',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
};
