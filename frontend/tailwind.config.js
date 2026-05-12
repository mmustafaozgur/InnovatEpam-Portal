/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:    '#1E40AF',
        secondary:  '#3B82F6',
        cta:        '#F59E0B',
        background: '#F8FAFC',
        'text-base':'#1E3A8A',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body:    ['Open Sans', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}

