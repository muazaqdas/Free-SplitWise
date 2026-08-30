/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dino/Pokemon mascot palette — see assets/AI for reference art.
        cream: '#FBF4E3',
        parchment: '#F1E1B8',
        sand: '#D9C08C',
        ink: '#2B2416',
        moss: '#7A6F52',
        forest: {
          DEFAULT: '#4B7A5B',
          dark: '#365C43',
        },
        gold: '#E7A73B',
        coral: '#D9614F',
        plum: '#8B6FA8',
      },
    },
  },
  plugins: [],
};
