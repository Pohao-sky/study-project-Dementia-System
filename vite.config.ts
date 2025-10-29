import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['himhealth.mcu.edu.tw'],
    host: '0.0.0.0',
    port: 8008
  }
})
