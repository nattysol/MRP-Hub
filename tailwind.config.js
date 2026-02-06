/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Manual dark mode toggle
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5', // Calm Indigo
        background: {
          light: '#f3f4f6', // Warm Zinc
          dark: '#111827',  // Deep Charcoal
        },
        card: {
          light: '#ffffff',
          dark: '#1f2937',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
      // --- ANIMATION CONFIG ---
      animation: {
        'fadeIn': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slideUp': 'slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'scaleIn': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}