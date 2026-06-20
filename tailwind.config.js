/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        calm: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        ocean: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      },
      keyframes: {
        breatheIn: {
          '0%':   { transform: 'scale(1)',    opacity: '0.7' },
          '100%': { transform: 'scale(1.35)', opacity: '1'   },
        },
        breatheOut: {
          '0%':   { transform: 'scale(1.35)', opacity: '1'   },
          '100%': { transform: 'scale(1)',    opacity: '0.7' },
        },
        breatheHold: {
          '0%, 100%': { transform: 'scale(1.35)', opacity: '1' },
        },
        pulseRing: {
          '0%':   { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(20,184,166,0.5)' },
          '70%':  { transform: 'scale(1)',    boxShadow: '0 0 0 20px rgba(20,184,166,0)'  },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(20,184,166,0)'   },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        pulseRecord: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.5)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(239,68,68,0)' },
        },
      },
      animation: {
        'breathe-in':  'breatheIn  4s ease-in-out forwards',
        'breathe-hold-in': 'breatheHold 7s ease-in-out forwards',
        'breathe-out': 'breatheOut 8s ease-in-out forwards',
        'pulse-ring':  'pulseRing  2s ease-out infinite',
        'fade-in':     'fadeIn     0.4s ease-out both',
        'pulse-record': 'pulseRecord 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
