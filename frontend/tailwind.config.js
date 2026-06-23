/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#d9e6ff', 200: '#bcd2ff', 300: '#8eb4ff',
          400: '#598cff', 500: '#3366ff', 600: '#1f47f5', 700: '#1735e1',
          800: '#192db6', 900: '#1a2c8f', 950: '#141c54',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -6px rgba(16,24,40,0.08)',
        glow: '0 0 0 1px rgba(51,102,255,0.1), 0 8px 30px -8px rgba(51,102,255,0.35)',
      },
    },
  },
  plugins: [],
};
