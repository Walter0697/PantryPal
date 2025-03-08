/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
        },
        secondary: {
          50: '#e6ffee',
          100: '#ccffdd',
          200: '#99ffbb',
          300: '#66ff99',
          400: '#33ff77',
          500: '#00ff55',
          600: '#00cc44',
          700: '#009933',
          800: '#006622',
          900: '#003311',
        },
        dark: {
          blue: '#0a192f',
          'blue-light': '#112240',
          'blue-lighter': '#1e3a8a',
        },
      },
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [],
}
