/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Disable Tailwind's CSS reset (preflight) so it doesn't interfere
  // with the app's existing hand-crafted styles.
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // Map shadcn's semantic color tokens to the app's CSS variables
        // so components like GooeyText render correctly in both themes.
        foreground: "var(--text)",
        background: "var(--bg)",
        border: "var(--border)",
        accent: "var(--accent)",
        muted: "var(--text-secondary)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
