/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        aws: {
          orange: '#FF9900',
          dark: '#232F3E',
          light: '#F8F8F8',
        },
      },
    },
  },
  plugins: [],
}
