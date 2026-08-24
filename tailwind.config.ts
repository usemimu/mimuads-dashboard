import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

/**
 * Brand system ported from mimu-web (the design source of truth). Palettes and
 * fonts mirror the mobile design language: clay (primary), moss (success/live),
 * gold (accent/verified), neutral (surfaces/text). Money uses the mono font.
 */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clay: {
          50: '#FBF4F0',
          100: '#F4E3D7',
          200: '#E8C5AC',
          300: '#D9A07B',
          400: '#C8774C',
          500: '#B55430',
          600: '#974127',
          700: '#79321E',
          800: '#5A2416',
          900: '#37150C',
        },
        moss: {
          50: '#EEF5F1',
          100: '#D2E9DA',
          200: '#A4D2B4',
          300: '#6EB489',
          400: '#479462',
          500: '#2B7244',
          600: '#215836',
          700: '#184028',
          800: '#102A1B',
          900: '#091A10',
        },
        gold: {
          50: '#FCF7E8',
          100: '#F7ECC4',
          200: '#EDD88A',
          300: '#E0BF50',
          400: '#CFA430',
          500: '#B4881C',
          600: '#8D6A15',
          700: '#684E0F',
          800: '#44330A',
          900: '#261E05',
        },
        neutral: {
          50: '#F7F5F2',
          100: '#EDE9E3',
          200: '#DDD8D0',
          300: '#C5BDB3',
          400: '#A89F94',
          500: '#7E766C',
          600: '#5E574F',
          700: '#403C36',
          800: '#282420',
          900: '#0E0D0B',
        },
        // Warm hairline borders (mirrors the admin console's --border tokens)
        // so cards, sidebar and tables read "considered", not grey.
        line: {
          DEFAULT: '#E6E1D9',
          strong: '#DDD8D0',
        },
      },
      fontFamily: {
        display: ['Aeonik', 'Georgia', 'serif'],
        body: ['Aeonik', 'system-ui', 'sans-serif'],
        mono: ['Aeonik', '"Courier New"', 'monospace'],
      },
      // Restrained, warm-tinted elevation — an "editorial console" surface
      // language: cards lean on a hairline border with only a whisper of
      // shadow (admin-style), reserving real elevation (`pop`) for menus,
      // toasts and modals. Alpha uses the ink neutral so shadows read warm.
      boxShadow: {
        card: '0 1px 2px rgba(14, 13, 11, 0.05)',
        'card-hover': '0 4px 14px -4px rgba(14, 13, 11, 0.12)',
        pop: '0 4px 8px rgba(14, 13, 11, 0.06), 0 24px 48px -24px rgba(14, 13, 11, 0.22)',
        // Floating shell panels (X-style) — soft lift off the tinted background.
        float: '0 1px 2px rgba(14, 13, 11, 0.04), 0 12px 28px -14px rgba(14, 13, 11, 0.14)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
      },
    },
  },
  plugins: [forms],
} satisfies Config
