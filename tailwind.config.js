/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    borderRadius: {
      'none': '0',
      'sm': '0',
      'DEFAULT': '2px',
      'md': '2px',
      'lg': '3px',
      'xl': '4px',
      '2xl': '4px',
      '3xl': '6px',
      'full': '9999px',
    },
    extend: {
      colors: {
        swan: {
          black: '#0f1114',
          dark: '#181b20',
          card: '#1e2228',
          border: '#2d3139',
          muted: '#3d424a',
          accent: '#c8a96e',
          gold: '#d4af37',
          silver: '#c0c0c0',
          text: '#e8e8e8',
          sub: '#8b9099',
        },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
