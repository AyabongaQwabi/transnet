/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        transnet: {
          red: '#ef4435',
          green: '#8ac626',
          gray: '#8d9858'
        }
      }
    },
  },
  plugins: [],
};