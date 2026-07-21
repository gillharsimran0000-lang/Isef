import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Tailwind resolves `content` globs against the process CWD, not against this
// file. Anchoring them to the config's own directory means the build emits the
// same CSS whether it is started from the repo root, a workspace script, or an
// editor.
const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [join(here, 'index.html'), join(here, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        // Every colour is a CSS variable so light/dark swap without a single
        // component knowing which theme is active.
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-well': 'var(--bg-well)',
        border: 'var(--border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-faint': 'var(--text-faint)',
        accent: 'var(--color-accent)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        serif: ['var(--font-serif)'],
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      transitionTimingFunction: {
        'out-strong': 'var(--ease-out-strong)',
        'in-out-strong': 'var(--ease-in-out-strong)',
      },
    },
  },
  plugins: [],
};
