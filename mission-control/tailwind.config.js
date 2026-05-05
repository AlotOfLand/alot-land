/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#0A0A0A',
        'gold': '#F5B800',
        'green-brand': '#3CB054',
      },
      fontFamily: {
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
