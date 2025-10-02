// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paw: { DEFAULT: '#f472b6', dark: '#db2777' },
        cream: '#fef3c7',
      }
    },
  },
  plugins: [],
}