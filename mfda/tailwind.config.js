/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // On-brand (Alot Of Land). MFDA is a light, professional analyst tool —
        // dense financial tables + print-to-PDF read better on a warm neutral
        // ground than the dark in-house tools.
        bg: '#F9F6F0',
        surface: '#FFFFFF',
        'surface-2': '#F4EFE6',
        border: '#E4DDD0',
        'border-hi': '#D6CCB8',
        ink: '#1A1A1A',
        'ink-2': '#4A4A4A',
        muted: '#8A8272',
        gold: '#F5B800',
        green: '#3CB054',
        'green-deep': '#2E8C43',
        blue: '#3E6DA3',
        danger: '#C0392B',
        warn: '#B8860B',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { xl: '12px', '2xl': '16px' },
    },
  },
  plugins: [],
};
