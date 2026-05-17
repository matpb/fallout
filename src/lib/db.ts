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
		// v2: added weapons[], armor[], misterHandyVariant, misterHandyAttachments,
		// vaultNumber, vaultExperiment. All optional / array defaults so old rows still load
		// — we backfill at read time in normalizeCharacter() below.
		this.version(2).stores({
			characters: 'id, name, originKey, level, updatedAt'
		});
	}
}

export const db = new PipBoyDB();

function normalizeCharacter(c: Character): Character {
	// Idempotent backfill so v1 → v2 reads don't crash, and so a re-saved character
	// upgrades its on-disk shape.
	c.schemaVersion = 2;
	if (!Array.isArray(c.weapons)) c.weapons = [];
	if (!Array.isArray(c.armor)) c.armor = [];
	// Old characters predate the createdSpecial snapshot — seed from current values
	// so "(started N)" hints don't pop up for never-edited stats.
	if (!c.createdSpecial) c.createdSpecial = { ...c.special };
	// Mister Handy: backfill default loadout if origin is misterHandy but fields are missing
	if (c.originKey === 'misterHandy') {
		if (!c.misterHandyVariant) c.misterHandyVariant = 'misterHandy';
		if (!Array.isArray(c.misterHandyAttachments) || c.misterHandyAttachments.length !== 3) {
			c.misterHandyAttachments = ['pincer', 'flamer', 'laserEmitter'];
		}
		if (typeof c.misterHandyPlating !== 'string') c.misterHandyPlating = 'Standard Plating';
		if (!Array.isArray(c.robotMods)) c.robotMods = [];
	}
	return c;
}

export async function listCharacters(): Promise<Character[]> {
	const rows = await db.characters.orderBy('updatedAt').reverse().toArray();
	return rows.map(normalizeCharacter);
}

export async function getCharacter(id: string): Promise<Character | undefined> {
	const c = await db.characters.get(id);
	return c ? normalizeCharacter(c) : undefined;
}

export async function saveCharacter(c: Character): Promise<void> {
	c.updatedAt = Date.now();
	normalizeCharacter(c);
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
