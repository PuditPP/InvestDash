/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        sidebar: '#121212',
        card: '#1e1e1e',
        'card-hover': '#2a2a2a',
        border: '#2e2e2e',
        success: '#10b981',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
}
