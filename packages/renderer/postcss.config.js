/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {
      config: './packages/renderer/tailwind.config.js',
    },
    autoprefixer: {},
  },
}

export default config
