import Dexie, { type Table } from 'dexie';
import { exportDB, importInto } from 'dexie-export-import';
import type { Character } from './fallout/types';

class PipBoyDB extends Dexie {
	characters!: Table<Character, string>;

	constructor() {
		super('pipboy3000');
		this.version(1).stores({
			characters: 'id, name, originKey, level, updatedAt'
		});
	}
}

export const db = new PipBoyDB();

export async function listCharacters(): Promise<Character[]> {
	return db.characters.orderBy('updatedAt').reverse().toArray();
}

export async function getCharacter(id: string): Promise<Character | undefined> {
	return db.characters.get(id);
}

export async function saveCharacter(c: Character): Promise<void> {
	c.updatedAt = Date.now();
	await db.characters.put(c);
}

export async function deleteCharacter(id: string): Promise<void> {
	await db.characters.delete(id);
}

export async function exportAll(): Promise<Blob> {
	return exportDB(db, { prettyJson: true });
}

export async function importAll(blob: Blob, mode: 'replace' | 'merge' = 'merge'): Promise<void> {
	if (mode === 'replace') {
		await db.characters.clear();
	}
	await importInto(db, blob, {
		acceptNameDiff: false,
		acceptVersionDiff: true,
		clearTablesBeforeImport: false,
		overwriteValues: true
	});
}
