/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FBFBF8",
        mist: "#DBE3E9",
        cornflower: {
          DEFAULT: "#6AA6DA",
          hover: "#5895C9",
          muted: "rgba(106, 166, 218, 0.15)"
        },
        pear: {
          DEFAULT: "#E1E5AC",
          hover: "#D2D69B",
          muted: "rgba(225, 229, 172, 0.15)"
        },
        obsidian: {
          DEFAULT: "#191C10",
          deep: "#11130B",
          surface: "#1F2314",
          card: "#262B1A",
          border: "rgba(219, 227, 233, 0.08)",
          borderHover: "rgba(106, 166, 218, 0.35)"
        },
        graphite: {
          DEFAULT: "#242424",
          subtle: "#1C1C1C",
          border: "#333333"
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-cornflower': '0 0 30px -5px rgba(106, 166, 218, 0.25)',
        'glow-pear': '0 0 30px -5px rgba(225, 229, 172, 0.2)',
      }
    },
  },
  plugins: [],
}
