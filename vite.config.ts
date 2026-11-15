import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const base = '/panel_kalkylator/';
export default defineConfig({ base, plugins: [react(), VitePWA({ registerType: 'prompt', scope: base, includeAssets: ['apple-touch-icon.png'], manifest: { id: base, name: 'Panel – lockpanelkalkylator', short_name: 'Panel', description: 'Måttsättning av lockpanel med knutbrädor', lang: 'sv', start_url: base, scope: base, display: 'standalone', background_color: '#f5f3ec', theme_color: '#243d32', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, workbox: { clientsClaim: true, navigateFallback: base + 'index.html' } })] });
