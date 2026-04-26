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

export const SKILL_DESCRIPTIONS: Record<SkillKey, string> = {
	athletics: 'Lift, push, pull, jump, climb, swim, sprint. Anything physical that isn\'t a fight.',
	barter: 'Buy and sell. Opposed CHA+Barter rolls let you shift prices ±10% per win.',
	bigGuns: 'Miniguns, rocket launchers, Fat Mans, gatling lasers. Heavy two-hand weapons.',
	energyWeapons: 'Lasers, plasma, gauss, pulse. Default for most pre-war energy small arms.',
	explosives: 'Throw or place grenades, mines, dynamite. Disarm explosive traps.',
	lockpick: 'Open mechanical locks (doors, safes, toolboxes) without a key.',
	medicine: 'First Aid, stabilize the dying, treat injuries, brew/use chems effectively.',
	meleeWeapons: 'Bats, knives, sledges, machetes, swords. Anything you swing or stab with.',
	pilot: 'Drive vehicles or fly Vertibirds. Rare in most campaigns.',
	repair: 'Fix and modify weapons, armor, robots. Build defenses, craft items from scrap.',
	science: 'Hack computer terminals, brew chems, craft energy-weapon mods, solve problems with science.',
	smallGuns: 'Pistols, rifles, shotguns. The bread-and-butter ranged skill.',
	sneak: 'Move quietly, stay hidden, sneak attacks (auto-Vicious if target unaware).',
	speech: 'Persuade, lie, intimidate, inspire. Roleplaying glue.',
	survival: 'Forage, hunt, cook, navigate, endure cold/heat/disease. Healing while resting.',
	throwing: 'Spears, throwing knives, improvised weapons (not grenades — those are Explosives).',
	unarmed: 'Punch, kick, grapple. Pairs with Power Fists and similar.'
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

export const SPECIAL_LABELS: Record<
	SpecialKey,
	{
		full: string;
		short: string;
		summary: string;
		uses: string[];
		feel: string;
	}
> = {
	strength: {
		full: 'Strength',
		short: 'STR',
		summary: 'Raw physical power. How hard you hit, how much you can carry.',
		uses: [
			'Melee Weapons / Unarmed attack rolls',
			'Athletics (climb, lift, push, swim)',
			'Carry Weight = 150 + (STR × 10) lbs',
			'Bonus melee damage: +1 CD at 7-8, +2 CD at 9-10, +3 CD at 11+'
		],
		feel: 'Raise STR if you want a melee bruiser, power-armor user, or anyone wielding heavy weapons.'
	},
	perception: {
		full: 'Perception',
		short: 'PER',
		summary: 'Awareness, sharp eyes, fast reactions. Default for most ranged and tracking work.',
		uses: [
			'Energy Weapons attack rolls (lasers, plasma, gauss)',
			'Explosives, Lockpick, Pilot tests',
			'Initiative = PER + AGI',
			'Survival/awareness rolls to spot ambushes and scavenge well'
		],
		feel: 'Raise PER for laser-focused snipers, scouts, scavengers, or anyone who shoots energy weapons.'
	},
	endurance: {
		full: 'Endurance',
		short: 'END',
		summary: 'Toughness and stamina. How much damage you can absorb before going down.',
		uses: [
			'Big Guns attack rolls (miniguns, Fat Mans, gatling lasers)',
			'Survival rolls (food, water, exposure, disease, healing-while-resting)',
			'Max HP = END + LCK (+1 per level + Life Giver perk)',
			'Resistance to addiction, fatigue, and radiation effects'
		],
		feel: 'Raise END for tanks, heavy-weapon specialists, ghouls, super mutants, anyone planning to take hits.'
	},
	charisma: {
		full: 'Charisma',
		short: 'CHA',
		summary: 'How well people respond to you. Persuasion, deception, leadership.',
		uses: [
			'Speech (persuade, lie, intimidate, inspire)',
			'Barter (haggling for better prices)',
			'Commanding allied NPCs in combat',
			'Companion morale and faction reputation'
		],
		feel: 'Raise CHA for faces, traders, leaders, or anyone who wants to talk their way past fights.'
	},
	intelligence: {
		full: 'Intelligence',
		short: 'INT',
		summary: 'Brains and book-learning. Powers most of the support / crafting toolkit.',
		uses: [
			'Medicine, Repair, Science skill rolls',
			'Hacking computers and terminals',
			'Skill points at character creation: 9 + INT',
			'Crafting weapons, armor, chems, mods'
		],
		feel: 'Raise INT for medics, gunsmiths, hackers, mad scientists. Also: more skill points means a more well-rounded character.'
	},
	agility: {
		full: 'Agility',
		short: 'AGI',
		summary: 'Speed, reflexes, fine motor control. The rogue/scout stat.',
		uses: [
			'Small Guns attack rolls (pistols, rifles, shotguns)',
			'Sneak and Throwing rolls',
			'Initiative = PER + AGI',
			'Defense = 1 (AGI 1-8) or 2 (AGI 9+)'
		],
		feel: 'Raise AGI for gunslingers, snipers, sneaky thieves, and assassins. AGI 9+ is a soft milestone for the +1 Defense.'
	},
	luck: {
		full: 'Luck',
		short: 'LCK',
		summary: 'Fortune favors the well-prepared. Spend Luck Points to bend reality.',
		uses: [
			'Luck Points (= LCK) refresh each quest, spend to: re-roll dice, swap LCK for another attribute on a test, jump initiative, introduce a helpful detail',
			'Counts toward Max HP (= END + LCK)',
			'Required for several powerful perks: Better Criticals (LCK 9 = D&D Smite), Ricochet (LCK 10), Daring Nature (LCK 7)',
			'GM may call for LCK rolls when something is up to chance'
		],
		feel: 'Raise LCK for crit-fishers, gamblers, "nothing ever quite goes wrong" types. Even non-Luck builds benefit from 5-6 for the HP and re-rolls.'
	}
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
