// SPA mode — no SSR (Dexie + IndexedDB are browser-only),
// but prerender the HTML shell so static hosting works.
export const ssr = false;
export const prerender = true;
export const trailingSlash = 'never';
