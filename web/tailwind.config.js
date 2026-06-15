/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        mint: { 500: "#10b981", 600: "#059669" },
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(15,23,42,.08)",
        card: "0 1px 3px rgba(15,23,42,.06), 0 8px 24px -8px rgba(15,23,42,.08)",
      },
    },
  },
  plugins: [],
};
