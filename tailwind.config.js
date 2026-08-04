/** @type {import('tailwindcss').Config} */
// Structure mirrors Production Core's config; the COLOURS are Cabinet Core's
// own (family DNA taken from JoineryCore, not PC's teal) — SPEC section 7.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark shell surface layers (JoineryCore hexes)
        shell: {
          900: '#1a1a1a',   // deepest bg (topbar, page)
          800: '#252526',   // panel bg
          700: '#2d2d30',   // elevated card / hover
          600: '#3e3e42',   // borders, dividers
        },
        // Text hierarchy
        ink: {
          50:  '#f2f2f0',   // primary text
          100: '#d6d6d2',   // secondary text
          200: '#a8a8a2',   // muted text
          400: '#7a7a74',   // subtle text
          600: '#5a5a55',   // disabled
        },
        // JoineryCore gold accent
        gold: {
          DEFAULT: '#AA8E68',
          hover:   '#C8A678',
          dark:    '#8F7654',
        },
        // Drawing canvas / room
        canvas: '#fafaf8',
        // Status colours
        status: {
          warn:   '#d9a441',
          danger: '#c9524b',
          ok:     '#5f9e6e',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)',
        gold:  '0 0 0 1px rgba(170,142,104,0.5)',
      },
    },
  },
  plugins: [],
};
