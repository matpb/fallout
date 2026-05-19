// Reactive Svelte 5 stores wrapping Dexie.

import { browser } from '$app/environment';
import { CloudConflictError, pushIfDirty } from './cloud';
import type { Character } from './fallout/types';
import {
	db,
	deleteCharacter as dbDelete,
	listCharacters as dbList,
	saveCharacter as dbSave
} from './db';

// Reactive view of the last cloud-sync result for any character — surfaced in
// the UI so users see "synced", "syncing…", or "conflict — server has a newer
// copy". One slot per character id is enough; concurrent edits to two
// characters are rare in this app.
export type CloudSyncStatus =
	| { kind: 'idle' }
	| { kind: 'syncing' }
	| { kind: 'synced'; at: number }
	| { kind: 'conflict'; serverPayload: string; serverUpdatedAt: number }
	| { kind: 'error'; message: string };

class CloudSyncStore {
	state = $state<Record<string, CloudSyncStatus>>({});
	set(id: string, s: CloudSyncStatus) {
		this.state[id] = s;
	}
	get(id: string): CloudSyncStatus {
		return this.state[id] ?? { kind: 'idle' };
	}
	clear(id: string) {
		delete this.state[id];
	}
}

export const cloudSync = new CloudSyncStore();

interface CharacterStore {
	loaded: boolean;
	items: Character[];
}

class CharactersStore {
	state = $state<CharacterStore>({ loaded: false, items: [] });

	async refresh() {
		if (!browser) return;
		const items = await dbList();
		this.state.items = items;
		this.state.loaded = true;
	}

	async upsert(c: Character) {
		// Deep-clone before save: callers may pass Svelte 5 reactive proxies,
		// which Dexie's internal structuredClone can't handle. JSON round-trip
		// produces a plain object that Dexie writes successfully.
		const plain = JSON.parse(JSON.stringify(c)) as Character;
		await dbSave(plain);
		this.cloudPush(plain);
		await this.refresh();
	}

	// Persist without triggering a refresh — used by the character sheet's
	// auto-save so a debounced write doesn't clobber in-flight edits when the
	// load effect re-runs. The roster picks up the change on its own refresh.
	async upsertSilent(c: Character) {
		const plain = JSON.parse(JSON.stringify(c)) as Character;
		await dbSave(plain);
		this.cloudPush(plain);
		// Best-effort: patch the in-memory list so the roster reflects the latest
		// title/level without a round-trip. If the row is missing we just append.
		const idx = this.state.items.findIndex((x) => x.id === plain.id);
		if (idx >= 0) {
			this.state.items[idx] = plain;
			this.state.items = [...this.state.items];
		} else {
			this.state.items = [plain, ...this.state.items];
		}
	}

	// Fire-and-forget push to the cloud. Local Dexie is the source of truth for
	// the next render — cloud is best-effort. Failures show up in the cloudSync
	// store so the UI can surface them, but never block a save.
	private cloudPush(c: Character) {
		if (!c.cloudToken) return;
		cloudSync.set(c.id, { kind: 'syncing' });
		pushIfDirty(c)
			.then((updated) => {
				cloudSync.set(c.id, { kind: 'synced', at: updated.cloudSyncedAt ?? Date.now() });
				// Persist the bumped cloudSyncedAt locally so we don't re-push the same
				// state on every reload. Don't trigger a refresh — this is metadata.
				dbSave(JSON.parse(JSON.stringify(updated))).catch(() => {
					// Local write failed; not fatal — next save attempt will retry.
				});
			})
			.catch((err: unknown) => {
				if (err instanceof CloudConflictError) {
					cloudSync.set(c.id, {
						kind: 'conflict',
						serverPayload: err.server.payload,
						serverUpdatedAt: err.server.updated_at
					});
					return;
				}
				cloudSync.set(c.id, {
					kind: 'error',
					message: err instanceof Error ? err.message : 'sync failed'
				});
			});
	}

	async remove(id: string) {
		await dbDelete(id);
		await this.refresh();
	}

	get(id: string): Character | undefined {
		return this.state.items.find((c) => c.id === id);
	}
}

export const characters = new CharactersStore();

export async function downloadBackup(filename = `pipboy-backup-${todayStamp()}.json`) {
	const { exportAll } = await import('./db');
	const blob = await exportAll();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export async function restoreFromFile(file: File, mode: 'replace' | 'merge') {
	const { importAll } = await import('./db');
	await importAll(file, mode);
	await characters.refresh();
}

function todayStamp(): string {
	const d = new Date();
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

export async function dbStats() {
	if (!browser) return { count: 0, sizeKB: 0 };
	const count = await db.characters.count();
	// Approximate by exporting and weighing (cheap for small DBs)
	const { exportAll } = await import('./db');
	const blob = await exportAll();
	return { count, sizeKB: Math.round((blob.size / 1024) * 10) / 10 };
}
