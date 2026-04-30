/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#09090B',
        'void-surface': '#111113',
        graphite: '#27272A',
        steel: '#3F3F46',
        ash: '#A1A1AA',
        fog: '#D4D4D8',
        snow: '#FAFAFA',
        ember: '#E8793A',
        'severity-high': '#EF4444',
        'severity-medium': '#F59E0B',
        'severity-low': '#22C55E',
        savings: '#4ADE80',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'savings-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(74,222,128,0)' },
          '50%': { boxShadow: '0 0 0 1px rgba(74,222,128,0.25)' },
        },
        'fade-slide': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-dismiss': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'savings-pulse': 'savings-pulse 4s ease-in-out infinite',
        'fade-slide': 'fade-slide 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'slide-dismiss': 'slide-dismiss 0.25s ease-in forwards',
      },
    },
  },
  plugins: [],
}
