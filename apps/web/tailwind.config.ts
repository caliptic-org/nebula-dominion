import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS custom properties
        bg: {
          DEFAULT: 'var(--color-bg)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          overlay: 'var(--color-bg-overlay)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          dim: 'var(--color-brand-dim)',
          glow: 'var(--color-brand-glow)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          dim: 'var(--color-accent-dim)',
        },
        energy: {
          DEFAULT: 'var(--color-energy)',
          dim: 'var(--color-energy-dim)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          hover: 'var(--color-border-hover)',
          focus: 'var(--color-border-focus)',
        },
        status: {
          success: 'var(--color-success)',
          danger: 'var(--color-danger)',
          warning: 'var(--color-warning)',
          info: 'var(--color-info)',
        },
        race: {
          human:     { DEFAULT: 'var(--race-human)',     dim: 'var(--race-human-dim)',     glow: 'var(--race-human-glow)' },
          zerg:      { DEFAULT: 'var(--race-zerg)',      dim: 'var(--race-zerg-dim)',      glow: 'var(--race-zerg-glow)' },
          automaton: { DEFAULT: 'var(--race-automaton)', dim: 'var(--race-automaton-dim)', glow: 'var(--race-automaton-glow)' },
          monster:   { DEFAULT: 'var(--race-monster)',   dim: 'var(--race-monster-dim)',   glow: 'var(--race-monster-glow)' },
          demon:     { DEFAULT: 'var(--race-demon)',     dim: 'var(--race-demon-dim)',     glow: 'var(--race-demon-glow)' },
        },
        mineral: 'var(--race-human)',
        gas:     'var(--color-accent)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'nebula-gradient': 'var(--gradient-nebula)',
        'hero-gradient': 'var(--gradient-hero)',
        'card-gradient': 'var(--gradient-card)',
        'brand-gradient': 'var(--gradient-brand)',
      },
      boxShadow: {
        'brand-glow': '0 0 20px var(--color-brand-glow)',
        'accent-glow': '0 0 20px var(--color-accent-dim)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':         'float 6s ease-in-out infinite',
        'star-twinkle':  'twinkle 4s ease-in-out infinite',
        'glow-pulse':    'glow-pulse 2s ease-in-out infinite',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.32,0.72,0,1) both',
        'fade-in':       'fadeIn 0.3s cubic-bezier(0.32,0.72,0,1) both',
        'scale-in':      'scaleIn 0.35s cubic-bezier(0.32,0.72,0,1) both',
        'resource-tick': 'resourceTick 0.25s cubic-bezier(0.32,0.72,0,1) both',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 10px var(--color-brand-glow)' },
          '50%': { boxShadow: '0 0 30px var(--color-brand-glow), 0 0 60px var(--color-brand-dim)' },
        },
        slideUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.92)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
        resourceTick: {
          '0%':   { transform: 'translateY(0) scale(1)' },
          '40%':  { transform: 'translateY(-3px) scale(1.12)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
