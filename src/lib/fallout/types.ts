// Core data model for a Fallout RPG character.
// Mechanics from the Modiphius Fallout: The Roleplaying Game (Core Rulebook, 3rd printing Feb 2023).

export type SpecialKey =
	| 'strength'
	| 'perception'
	| 'endurance'
	| 'charisma'
	| 'intelligence'
	| 'agility'
	| 'luck';

export type Special = Record<SpecialKey, number>;

export type SkillKey =
	| 'athletics'
	| 'barter'
	| 'bigGuns'
	| 'energyWeapons'
	| 'explosives'
	| 'lockpick'
	| 'medicine'
	| 'meleeWeapons'
	| 'pilot'
	| 'repair'
	| 'science'
	| 'smallGuns'
	| 'sneak'
	| 'speech'
	| 'survival'
	| 'throwing'
	| 'unarmed';

export type Skills = Record<SkillKey, number>;

export type OriginKey =
	| 'brotherhood'
	| 'ghoul'
	| 'superMutant'
	| 'misterHandy'
	| 'survivor'
	| 'vaultDweller';

export type DamageType = 'physical' | 'energy' | 'radiation' | 'poison';

export interface InventoryItem {
	id: string;
	name: string;
	qty: number;
	weight?: number;
	notes?: string;
}

export interface PerkPick {
	key: string;
	rank: number;
}

export interface Character {
	id: string; // uuid
	schemaVersion: 1;
	createdAt: number;
	updatedAt: number;

	// Identity
	name: string;
	originKey: OriginKey;
	level: number;
	xp: number;

	// SPECIAL — base values (4-10 typical, super mutant up to 12 STR/END)
	special: Special;

	// Skills 0-6 + tag skills (3-4)
	tagSkills: SkillKey[];
	skills: Skills;

	// Perks
	perks: PerkPick[];

	// Survivor traits (max 2) or Vault Dweller / origin trait notes
	traits: string[];

	// Equipment
	caps: number;
	inventory: InventoryItem[];
	trinket: string;

	// HP
	currentHp: number;
	currentLuck: number;

	// Misc
	notes: string;

	// Power Armor frame STR override (when active)
	powerArmorActive: boolean;
}

export const SKILL_DEFAULT_ATTR: Record<SkillKey, SpecialKey> = {
	athletics: 'strength',
	barter: 'charisma',
	bigGuns: 'endurance',
	energyWeapons: 'perception',
	explosives: 'perception',
	lockpick: 'perception',
	medicine: 'intelligence',
	meleeWeapons: 'strength',
	pilot: 'perception',
	repair: 'intelligence',
	science: 'intelligence',
	smallGuns: 'agility',
	sneak: 'agility',
	speech: 'charisma',
	survival: 'endurance',
	throwing: 'agility',
	unarmed: 'strength'
};

export const SKILL_LABELS: Record<SkillKey, string> = {
	athletics: 'Athletics',
	barter: 'Barter',
	bigGuns: 'Big Guns',
	energyWeapons: 'Energy Weapons',
	explosives: 'Explosives',
	lockpick: 'Lockpick',
	medicine: 'Medicine',
	meleeWeapons: 'Melee Weapons',
	pilot: 'Pilot',
	repair: 'Repair',
	science: 'Science',
	smallGuns: 'Small Guns',
	sneak: 'Sneak',
	speech: 'Speech',
	survival: 'Survival',
	throwing: 'Throwing',
	unarmed: 'Unarmed'
};

export const SPECIAL_KEYS: SpecialKey[] = [
	'strength',
	'perception',
	'endurance',
	'charisma',
	'intelligence',
	'agility',
	'luck'
];

export const SPECIAL_LABELS: Record<SpecialKey, { full: string; short: string }> = {
	strength: { full: 'Strength', short: 'STR' },
	perception: { full: 'Perception', short: 'PER' },
	endurance: { full: 'Endurance', short: 'END' },
	charisma: { full: 'Charisma', short: 'CHA' },
	intelligence: { full: 'Intelligence', short: 'INT' },
	agility: { full: 'Agility', short: 'AGI' },
	luck: { full: 'Luck', short: 'LCK' }
};

export const SKILL_KEYS: SkillKey[] = [
	'athletics',
	'barter',
	'bigGuns',
	'energyWeapons',
	'explosives',
	'lockpick',
	'medicine',
	'meleeWeapons',
	'pilot',
	'repair',
	'science',
	'smallGuns',
	'sneak',
	'speech',
	'survival',
	'throwing',
	'unarmed'
];
