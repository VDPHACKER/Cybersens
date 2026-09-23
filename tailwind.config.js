/** @type {import('tailwindcss').Config} */
export default {
  // Le thème est piloté par l'application (classe "dark" sur <html>)
  darkMode: 'class',
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};
