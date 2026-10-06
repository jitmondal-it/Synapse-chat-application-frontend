/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  extend: {
    keyframes: {
      messageIn: {
        "0%": {
          opacity: "0",
          transform: "translateY(8px) scale(0.98)",
        },
        "100%": {
          opacity: "1",
          transform: "translateY(0) scale(1)",
        },
      },
    },
    animation: {
      messageIn: "messageIn 0.25s ease-out",
    },
  },
},
  plugins: [],
  darkMode: "class",
};
