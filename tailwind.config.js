/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        steel: '#5b6b7a',
        nugget: '#ff6b35',
      },
    },
  },
  plugins: [],
};
