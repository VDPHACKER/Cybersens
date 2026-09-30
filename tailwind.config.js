/** @type {import('tailwindcss').Config} */
export default {
  // Le thème est piloté par l'application (classe "dark" sur <html>)
  darkMode: 'class',
  content: [
    './index.html',
    './*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#040a1c',
          900: '#081231',
          800: '#0d1b47',
          700: '#152863',
          600: '#1e3a8a',
        },
        brand: { DEFAULT: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' },
        gold: { DEFAULT: '#fbbf24', dark: '#f59e0b' },
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(2, 8, 32, 0.55)',
        glow: '0 0 0 1px rgba(59, 130, 246, 0.35), 0 8px 30px -8px rgba(37, 99, 235, 0.55)',
      },
    },
  },
  plugins: [],
};
