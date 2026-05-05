import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    apple: {
      sizes: [180],
      padding: 0.15,
    },
    transparent: {
      sizes: [64, 192, 512],
      padding: 0.1,
      favicons: [[48, 'favicon-48.png']],
    },
    maskable: {
      sizes: [512],
      padding: 0.15,
    },
  },
  images: ['public/logo.svg'],
})
