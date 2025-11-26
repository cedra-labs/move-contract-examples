/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontWeight: {
        thin: '200',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '500',
        bold: '600',
        extrabold: '700',
        black: '800',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'sans-serif',
        ],
      },
      colors: {
        // Theme-aware colors using CSS variables
        'theme': {
          'bg': 'var(--bg)',
          'bg-soft': 'var(--bg-soft)',
          'text': 'var(--text)',
          'text-dim': 'var(--text-dim)',
          'card': 'var(--card-bg)',
          'border': 'var(--border)',
        },
        'dark': {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
          950: '#0f0f11',
        }
      },
      backgroundColor: {
        'theme': 'var(--bg)',
        'theme-card': 'var(--card-bg)',
        'theme-soft': 'var(--bg-soft)',
      },
      textColor: {
        'theme': 'var(--text)',
        'theme-dim': 'var(--text-dim)',
      },
      borderColor: {
        'theme': 'var(--border)',
      }
    },
  },
  plugins: [],
};
