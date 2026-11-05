import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0d14',
        foreground: '#f1f5f9',
        card: {
          DEFAULT: '#111622',
          foreground: '#f1f5f9',
          border: '#1e2638',
        },
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#06b6d4',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#1a2234',
          foreground: '#94a3b8',
        },
        danger: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

