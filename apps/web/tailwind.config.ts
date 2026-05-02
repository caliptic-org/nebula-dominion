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
        // Base space theme
        space: {
          black: '#080a10',
          panel: '#0d1117',
          elevated: '#141d2b',
          overlay: 'rgba(8,10,16,0.92)',
        },
        // Race color tokens
        race: {
          zerg: '#44ff44',
          'zerg-dim': 'rgba(68,255,68,0.12)',
          'zerg-glow': 'rgba(68,255,68,0.4)',
          otomat: '#00cfff',
          'otomat-dim': 'rgba(0,207,255,0.12)',
          'otomat-glow': 'rgba(0,207,255,0.4)',
          canavar: '#ff6600',
          'canavar-dim': 'rgba(255,102,0,0.12)',
          'canavar-glow': 'rgba(255,102,0,0.4)',
          insan: '#4a9eff',
          'insan-dim': 'rgba(74,158,255,0.12)',
          'insan-glow': 'rgba(74,158,255,0.4)',
          seytan: '#cc00ff',
          'seytan-dim': 'rgba(204,0,255,0.12)',
          'seytan-glow': 'rgba(204,0,255,0.4)',
        },
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
        'race-gradient': 'var(--gradient-race)',
        'halftone': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Ccircle cx='3' cy='3' r='1' fill='white' fill-opacity='0.06'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'brand-glow': '0 0 20px var(--color-brand-glow)',
        'race-glow': '0 0 24px var(--color-race), 0 0 48px var(--color-race-glow)',
        'manga-panel': 'inset 0 0 0 3px rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.8)',
        'card': '0 4px 24px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.7)',
        'neon': '0 0 10px var(--color-race), 0 0 40px var(--color-race-glow)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'star-twinkle': 'twinkle 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'manga-appear': 'manga-appear 0.6s cubic-bezier(0.32,0.72,0,1) forwards',
        'slide-up': 'slide-up 0.7s cubic-bezier(0.32,0.72,0,1) forwards',
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
          '0%, 100%': { boxShadow: '0 0 10px var(--color-race-glow)' },
          '50%': { boxShadow: '0 0 30px var(--color-race), 0 0 60px var(--color-race-glow)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'manga-appear': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(16px)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.32,0.72,0,1)',
        'bounce-out': 'cubic-bezier(0.34,1.56,0.64,1)',
      },
    },
  },
  plugins: [],
}

export default config
