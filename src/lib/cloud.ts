// Cloud sync client for the fallout-sync Worker.
//
// Each character carries a `cloudToken` (32-byte url-safe random) once the user
// opts in. The token is the bearer credential — anyone with it can read/write
// the character. It's surfaced in the UI and also forms the recovery URL at
// /r/<token>.
//
// The Worker URL is set at build time via PUBLIC_CLOUD_API_URL; if missing,
// cloud sync silently disables itself so the app keeps working offline-only.
//
// Conflict policy: PUT sends `updatedAt`; the server returns 409 + the newer
// server payload if its copy is strictly newer. Callers decide what to do.

import { env } from '$env/dynamic/public';
import type { Character } from './fallout/types';

// PUBLIC_CLOUD_API_URL is set at build time by the GitHub Actions deploy step.
// When missing (local dev with no .env, etc.) we silently disable cloud sync —
// the app stays useful offline-only.
const API_URL = (env.PUBLIC_CLOUD_API_URL || '').replace(/\/+$/, '');

export function cloudConfigured(): boolean {
	return API_URL.length > 0;
}

export function recoveryUrl(token: string, origin?: string): string {
	const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
	return `${base}/r/${token}`;
}

// 32 bytes → 43 url-safe base64 chars (no padding). ~256 bits of entropy.
export function generateToken(): string {
	const buf = new Uint8Array(32);
	crypto.getRandomValues(buf);
	let s = '';
	for (const b of buf) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function serializeForCloud(c: Character): string {
	// Strip the local-only fields before pushing. cloudToken is the credential,
	// cloudSyncedAt is a local timestamp — neither belongs in the cloud payload.
	const { cloudToken: _t, cloudSyncedAt: _s, ...rest } = c;
	return JSON.stringify(rest);
}

interface ConflictResponse {
	server: { id: string; payload: string; updated_at: number; server_at: number };
}

export class CloudConflictError extends Error {
	server: ConflictResponse['server'];
	constructor(server: ConflictResponse['server']) {
		super('cloud_conflict');
		this.server = server;
	}
}

export class CloudUnconfiguredError extends Error {
	constructor() {
		super('cloud_unconfigured');
	}
}

async function api<T>(path: string, init: RequestInit & { token: string }): Promise<T> {
	if (!cloudConfigured()) throw new CloudUnconfiguredError();
	const res = await fetch(`${API_URL}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${init.token}`
		}
	});
	if (res.status === 409) {
		const body = (await res.json()) as ConflictResponse;
		throw new CloudConflictError(body.server);
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`cloud_${res.status}: ${text.slice(0, 200)}`);
	}
	return (await res.json()) as T;
}

// First-time opt-in: generate a token, POST the character, return the updated
// character with cloudToken + cloudSyncedAt set. Caller is responsible for
// re-saving locally and showing the token to the user.
export async function enableSync(c: Character): Promise<Character> {
	const token = generateToken();
	const payload = serializeForCloud(c);
	const updatedAt = c.updatedAt;
	const res = await api<{ id: string; server_at: number }>(`/v1/characters`, {
		method: 'POST',
		token,
		body: JSON.stringify({ id: c.id, payload, updatedAt })
	});
	return { ...c, cloudToken: token, cloudSyncedAt: res.server_at };
}

// Push the latest local copy. Caller has already written to Dexie.
// Returns the same character with cloudSyncedAt bumped.
// May throw CloudConflictError; on conflict the caller should reconcile.
export async function pushIfDirty(c: Character): Promise<Character> {
	if (!c.cloudToken) return c;
	const payload = serializeForCloud(c);
	const res = await api<{ id: string; server_at: number }>(
		`/v1/characters/${encodeURIComponent(c.id)}`,
		{
			method: 'PUT',
			token: c.cloudToken,
			body: JSON.stringify({ payload, updatedAt: c.updatedAt })
		}
	);
	return { ...c, cloudSyncedAt: res.server_at };
}

// Fetch a character by token alone (used by /r/<token>). The server enforces
// the token-match; "no such token" and "token owns a soft-deleted row" both
// come back as 404 to avoid probing surface.
export async function pull(token: string): Promise<Character> {
	const res = await api<{ id: string; payload: string; updated_at: number; server_at: number }>(
		`/v1/lookup`,
		{ method: 'GET', token }
	);
	const parsed = JSON.parse(res.payload) as Character;
	return { ...parsed, cloudToken: token, cloudSyncedAt: res.server_at };
}

export async function disableSync(c: Character): Promise<Character> {
	if (!c.cloudToken) return c;
	try {
		await api<{ id: string; deleted_at: number }>(
			`/v1/characters/${encodeURIComponent(c.id)}`,
			{ method: 'DELETE', token: c.cloudToken }
		);
	} catch (e) {
		// If the server is unreachable or the row is already gone, we still drop
		// the local token — the user's intent is "stop syncing this character".
		console.warn('cloud delete failed, dropping local token anyway', e);
	}
	const { cloudToken: _t, cloudSyncedAt: _s, ...rest } = c;
	return rest as Character;
}
