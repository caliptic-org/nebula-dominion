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
        bg: {
          DEFAULT: 'var(--color-bg)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          overlay: 'var(--color-bg-overlay)',
          card: 'var(--color-bg-card)',
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
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          dim: 'var(--color-accent-dim)',
          glow: 'var(--color-accent-glow)',
        },
        energy: {
          DEFAULT: 'var(--color-energy)',
          hover: 'var(--color-energy-hover)',
          dim: 'var(--color-energy-dim)',
          glow: 'var(--color-energy-glow)',
        },
        mineral: {
          DEFAULT: 'var(--color-mineral)',
          dim: 'var(--color-mineral-dim)',
        },
        gas: {
          DEFAULT: 'var(--color-gas)',
          dim: 'var(--color-gas-dim)',
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
        display: ['var(--font-display)', 'Orbitron', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Rajdhani', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'nebula-gradient': 'var(--gradient-nebula)',
        'hero-gradient': 'var(--gradient-hero)',
        'card-gradient': 'var(--gradient-card)',
        'brand-gradient': 'var(--gradient-brand)',
        'energy-gradient': 'var(--gradient-energy)',
        'battle-gradient': 'var(--gradient-battle)',
      },
      boxShadow: {
        'brand-glow': '0 0 20px var(--color-brand-glow)',
        'brand-glow-lg': '0 0 40px var(--color-brand-glow)',
        'accent-glow': '0 0 20px var(--color-accent-glow)',
        'energy-glow': '0 0 20px var(--color-energy-glow)',
        'energy-glow-lg': '0 0 40px var(--color-energy-glow)',
        'race-human': '0 0 20px var(--color-race-human-glow)',
        'race-zerg': '0 0 20px var(--color-race-zerg-glow)',
        'race-automaton': '0 0 20px var(--color-race-automaton-glow)',
        'race-monster': '0 0 20px var(--color-race-monster-glow)',
        'race-demon': '0 0 20px var(--color-race-demon-glow)',
        'card': '0 4px 24px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.7), 0 0 20px rgba(108,142,240,0.12)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
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
          '50%': { transform: 'translateY(-10px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 10px var(--color-race-glow)' },
          '50%': { boxShadow: '0 0 30px var(--color-race), 0 0 60px var(--color-race-glow)' },
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
