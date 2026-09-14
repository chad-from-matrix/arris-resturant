import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: 'var(--arris-gold)',
          light: 'var(--arris-gold-light)',
          pale: 'var(--arris-gold-pale)',
        },
        brown: {
          DEFAULT: 'var(--arris-brown)',
          deep: 'var(--arris-brown-deep)',
        },
        espresso: 'var(--arris-espresso)',
        copper: 'var(--arris-copper)',
        marble: {
          DEFAULT: 'var(--arris-marble)',
          vein: 'var(--arris-marble-vein)',
        },
        card: 'var(--arris-card)',
        line: 'var(--arris-line)',
        success: 'var(--arris-success)',
        warning: 'var(--arris-warning)',
        danger: 'var(--arris-danger)',
      },
      fontFamily: {
        script: ['var(--font-great-vibes)', 'cursive'],
        display: ['var(--font-cinzel)', 'Georgia', 'serif'],
        label: ['var(--font-antonio)', 'Impact', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '24px',
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(38,17,10,0.18), 0 2px 6px -2px rgba(38,17,10,0.08)',
        lift: '0 18px 44px -16px rgba(38,17,10,0.30)',
      },
      maxWidth: {
        shell: '1180px',
      },
    },
  },
  plugins: [],
};

export default config;
