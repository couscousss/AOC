/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-deep': 'var(--surface-deep)',
        'surface-raised': 'var(--surface-raised)',
        'surface-inset': 'var(--surface-inset)',
        line: 'var(--line)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        agent: 'var(--agent)',
        human: 'var(--human)',
        advisory: 'var(--advisory)',
        alarm: 'var(--alarm)',
        nominal: 'var(--nominal)',
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        narrow: ['"Archivo Narrow"', 'Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        11: ['11px', '16px'],
        12: ['12px', '16px'],
        14: ['14px', '20px'],
        16: ['16px', '22px'],
        20: ['20px', '26px'],
        28: ['28px', '34px'],
        40: ['40px', '46px'],
      },
    },
  },
  plugins: [],
};
