import Dexie, { type Table } from 'dexie';
import { exportDB, importInto } from 'dexie-export-import';
import type { ArmorPiece, Character } from './fallout/types';

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
		// v3: armor pieces switched from {location, dr} (single-location) to
		// {coverage: [{location, dr}]} (1-to-many). normalizeArmorPiece() folds the
		// old shape into a single-entry coverage[] so v2 characters keep working.
		this.version(3).stores({
			characters: 'id, name, originKey, level, updatedAt'
		});
	}
}

export const db = new PipBoyDB();

// v2 armor shape (single location + single DR object).
type V2ArmorPiece = Omit<ArmorPiece, 'coverage'> & {
	location?: ArmorPiece['coverage'][number]['location'];
	dr?: ArmorPiece['coverage'][number]['dr'];
};

function normalizeArmorPiece(a: ArmorPiece | V2ArmorPiece): ArmorPiece {
	if ('coverage' in a && Array.isArray(a.coverage)) {
		// Already v3 — clean up if anyone hand-stuffed it
		return {
			id: a.id,
			name: a.name,
			coverage: a.coverage.map((c) => ({
				location: c.location,
				dr: {
					physical: c.dr.physical || 0,
					energy: c.dr.energy || 0,
					radiation: c.dr.radiation || 0,
					poison: c.dr.poison || 0
				}
			})),
			weight: a.weight || 0,
			equipped: a.equipped ?? true,
			notes: a.notes
		};
	}
	// v2 → v3: lift the single location into a one-entry coverage[]
	const v2 = a as V2ArmorPiece;
	return {
		id: v2.id,
		name: v2.name,
		coverage:
			v2.location && v2.dr
				? [{ location: v2.location, dr: { ...v2.dr } }]
				: [],
		weight: v2.weight || 0,
		equipped: v2.equipped ?? true,
		notes: v2.notes
	};
}

function normalizeCharacter(c: Character): Character {
	// Idempotent backfill so v1 → v3 reads don't crash, and so a re-saved character
	// upgrades its on-disk shape.
	c.schemaVersion = 3;
	if (!Array.isArray(c.weapons)) c.weapons = [];
	if (!Array.isArray(c.armor)) {
		c.armor = [];
	} else {
		c.armor = c.armor.map((a) => normalizeArmorPiece(a as ArmorPiece | V2ArmorPiece));
	}
	// Old characters predate the createdSpecial snapshot — seed from current values
	// so "(started N)" hints don't pop up for never-edited stats.
	if (!c.createdSpecial) c.createdSpecial = { ...c.special };
	if (typeof c.radDamage !== 'number' || c.radDamage < 0) c.radDamage = 0;
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
