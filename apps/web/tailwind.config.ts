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
          human: 'var(--color-race-human)',
          'human-dim': 'var(--color-race-human-dim)',
          'human-glow': 'var(--color-race-human-glow)',
          zerg: 'var(--color-race-zerg)',
          'zerg-dim': 'var(--color-race-zerg-dim)',
          'zerg-glow': 'var(--color-race-zerg-glow)',
          automaton: 'var(--color-race-automaton)',
          'automaton-dim': 'var(--color-race-automaton-dim)',
          'automaton-glow': 'var(--color-race-automaton-glow)',
          monster: 'var(--color-race-monster)',
          'monster-dim': 'var(--color-race-monster-dim)',
          'monster-glow': 'var(--color-race-monster-glow)',
          demon: 'var(--color-race-demon)',
          'demon-dim': 'var(--color-race-demon-dim)',
          'demon-glow': 'var(--color-race-demon-glow)',
        },
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
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'star-twinkle': 'twinkle 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'neon-pulse': 'neon-pulse 2.5s ease-in-out infinite',
        'slide-in-up': 'slideInUp 0.35s ease-out',
        'fade-in-scale': 'fadeInScale 0.3s ease-out',
        'spin': 'spin 1s linear infinite',
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
          '0%, 100%': { boxShadow: '0 0 10px var(--color-brand-glow)' },
          '50%': { boxShadow: '0 0 30px var(--color-brand-glow), 0 0 60px var(--color-brand-dim)' },
        },
        'neon-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slideInUp': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fadeInScale': {
          from: { transform: 'scale(0.92)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
}

export default config
