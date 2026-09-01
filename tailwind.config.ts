import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2d5a27",
        "nav-bg": "#000000",
        "content-bg": "#F9FAFB",
      },
      fontFamily: {
        sans: ["'Open Sans'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
