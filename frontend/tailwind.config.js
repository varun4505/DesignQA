/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: '#2C2C2C',
          'bg-hover': '#383838',
          border: '#404040',
          text: '#FFFFFF',
          'text-secondary': '#B3B3B3',
          primary: '#18A0FB',
          'primary-hover': '#0D8CE0',
          success: '#0ACF83',
          warning: '#FFC700',
          error: '#F24822',
        }
      }
    },
  },
  plugins: [],
}
