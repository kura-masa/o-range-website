import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'orange-primary': '#FF8C42',
        'orange-light': '#FFB380',
        'orange-dark': '#E06F2B',
      },
      keyframes: {
        'indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        'indeterminate': 'indeterminate 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
