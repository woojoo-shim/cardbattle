import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Proxy /api to the Colyseus+Express server so the auth HTTP calls stay same-origin in
// dev (no CORS), mirroring production where the server serves the page and the API.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:2567' } },
});
