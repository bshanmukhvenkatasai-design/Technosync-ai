module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // enable class-based dark mode
  theme: {
    extend: {
      colors: {
        primary: '#2F5D62',
        secondary: '#96ACA0',
        accent: '#7CC6FE',
        background: '#F7F9F8',
        surface: '#FFFFFF',
        border: '#DCE5E2',
        heading: '#1F2937',
        text: '#4B5563',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
