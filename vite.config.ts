import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			strategies: 'generateSW',
			scope: '/',
			base: '/',
			manifest: {
				name: 'Pip-Boy 3000 — Character Manager',
				short_name: 'Pip-Boy 3000',
				description:
					'Offline character manager for Fallout: The Roleplaying Game (Modiphius). Backendless PWA, your data stays on your device.',
				theme_color: '#15ff60',
				background_color: '#0b1209',
				display: 'standalone',
				orientation: 'portrait',
				start_url: '/',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				navigateFallback: '/',
				navigateFallbackDenylist: [/^\/api/]
			},
			devOptions: {
				enabled: false,
				type: 'module',
				navigateFallback: '/'
			}
		})
	]
});
