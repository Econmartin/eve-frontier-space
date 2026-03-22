import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // EVE Frontier dark theme palette
        'eve-bg':       '#0a0c10',
        'eve-surface':  '#111318',
        'eve-border':   '#1e2229',
        'eve-gold':     '#c8a84b',
        'eve-gold-dim': '#7a6530',
        'eve-red':      '#e03c3c',
        'eve-green':    '#3ce058',
        'eve-blue':     '#3c8fe0',
        'eve-muted':    '#5a6070',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
