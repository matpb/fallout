// Reactive Svelte 5 stores wrapping Dexie.

import { browser } from '$app/environment';
import type { Character } from './fallout/types';
import {
	db,
	deleteCharacter as dbDelete,
	listCharacters as dbList,
	saveCharacter as dbSave
} from './db';

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
		await this.refresh();
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
