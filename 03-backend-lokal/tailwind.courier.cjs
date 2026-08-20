/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/courier.html"],
  theme: {
    extend: {
      colors: {
        primary: "#9f3d00",
        "primary-container": "#9f3d00",
        secondary: "#625e5a",
        "on-surface": "#1b1b1d",
        "on-surface-variant": "#594137",
        "tertiary-container": "#008376",
        "secondary-container": "#e8e1dc",
        "outline-variant": "#e1bfb2",
        "primary-fixed": "#ffdbcd",
      },
    },
  },
  corePlugins: { preflight: true },
};
