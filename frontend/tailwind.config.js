/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sentinel: {
          950: '#06090e',
          900: '#0d1117',
          850: '#131923',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
          500: '#484f58',
          accent: '#38bdf8',
          danger: '#f43f5e',
          warning: '#f59e0b',
          success: '#10b981',
          purple: '#a855f7',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
