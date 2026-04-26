// Type shims for the @vite-pwa/sveltekit virtual modules.
declare module 'virtual:pwa-info' {
	export interface PwaInfo {
		webManifest: {
			href: string;
			useCredentials: boolean;
			linkTag: string;
		};
		registerSW?: {
			inline: boolean;
			mode: 'auto' | 'classic' | 'module';
			scope: string;
			type: 'classic' | 'module';
			href: string;
		};
		view: {
			path: string;
			scope: string;
			base: string;
		};
	}
	export const pwaInfo: PwaInfo | undefined;
}

declare module 'virtual:pwa-register' {
	import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
	export type { RegisterSWOptions };
	export function registerSW(
		options?: RegisterSWOptions
	): (reloadPage?: boolean) => Promise<void>;
}
