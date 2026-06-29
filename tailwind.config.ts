import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e6e9f0',
          100: '#c0c7d8',
          200: '#97a3be',
          300: '#6d7fa4',
          400: '#4d6491',
          500: '#2e4a7e',
          600: '#284276',
          700: '#20376b',
          800: '#192d61',
          900: '#0d1b3e',
          950: '#080f24',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          light: '#86efac',
          dark: '#16a34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
