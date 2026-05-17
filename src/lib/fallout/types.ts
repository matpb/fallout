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

// Mister Handy chassis variants (Core Rulebook p.76-77).
// Each variant defines a fixed loadout of 3 arm attachments.
export type MisterHandyVariant =
	| 'misterHandy'
	| 'misterGutsy'
	| 'missNanny'
	| 'misterFarmhand'
	| 'nurseHandy';

// Arm attachments (Core Rulebook p.55).
export type ArmAttachment =
	| 'pincer'
	| 'buzzSaw'
	| 'tenMmAutoPistol'
	| 'laserEmitter'
	| 'flamer';

// Hit locations for armor coverage.
export type BodyLocation =
	| 'head'
	| 'torso'
	| 'leftArm'
	| 'rightArm'
	| 'leftLeg'
	| 'rightLeg';

export interface InventoryItem {
	id: string;
	name: string;
	qty: number;
	weight?: number;
	notes?: string;
}

// Weapons get their own structured shape so the table at game time
// can read damage CD, effects, range, ammo without rummaging in notes.
export interface WeaponItem {
	id: string;
	name: string;
	skill: SkillKey; // which skill rolls the attack
	damageCD: number; // base Combat Dice
	damageType: DamageType;
	damageEffects: string; // free-text: "Vicious, Piercing 1, Burst" — book qualities vary
	range: string; // "C / M / L / X" or "Close" / "Medium" / etc.
	fireRate: number; // 0 for melee
	ammo: string; // ammo type, e.g. "10mm", "5.56", "Fusion Cell" — blank for melee
	ammoQty: number; // current loaded/owned count
	qty: number; // weapon copies
	weight: number;
	mods?: string; // free-text mod list
	notes?: string;
}

// Armor pieces protect one body location with per-damage-type DR.
export interface ArmorPiece {
	id: string;
	name: string;
	location: BodyLocation;
	dr: {
		physical: number;
		energy: number;
		radiation: number;
		poison: number;
	};
	weight: number;
	equipped: boolean;
	notes?: string;
}

// Robot Mods (Core Rulebook p.184-185). Mr Handy can install up to 3.
// `key` references the catalog in origins.ts when picked from the list,
// or '__custom' if the user typed a homebrew mod by hand.
export interface RobotModPick {
	id: string;
	key: string; // e.g. 'reconSensors', 'diagnosis', '__custom'
	name: string; // editable; pre-filled from catalog when key matches
	effect: string; // editable; pre-filled from catalog when key matches
	notes?: string;
}

export interface PerkPick {
	key: string;
	rank: number;
}

export interface Character {
	id: string; // uuid
	schemaVersion: 2;
	createdAt: number;
	updatedAt: number;

	// Identity
	name: string;
	originKey: OriginKey;
	level: number;
	xp: number;

	// SPECIAL — base values (4-10 typical, super mutant up to 12 STR/END)
	special: Special;
	// Snapshot of `special` at character-creation time. Surfaced on the sheet as
	// "(started N)" hints if the live value drifts. Not used by any rules logic.
	createdSpecial?: Special;

	// Skills 0-6 + tag skills (3-4)
	tagSkills: SkillKey[];
	skills: Skills;

	// Perks
	perks: PerkPick[];

	// Survivor traits (max 2) or Vault Dweller / origin trait notes.
	// Note: Survivor's "1 trait + extra perk" path is encoded by traits.length === 1
	// (with the 2nd perk pick reflected in perks[]).
	traits: string[];

	// Equipment
	caps: number;
	inventory: InventoryItem[];
	weapons: WeaponItem[];
	armor: ArmorPiece[];
	trinket: string;
	// Optional pinned weapon — its profile shows at the top of the sheet.
	favoriteWeaponId?: string;

	// HP
	currentHp: number;
	currentLuck: number;

	// Misc
	notes: string;

	// Power Armor frame STR override (when active)
	powerArmorActive: boolean;

	// Origin-specific fields
	misterHandyVariant?: MisterHandyVariant;
	misterHandyAttachments?: ArmAttachment[]; // length === 3, individually editable
	misterHandyPlating?: string; // single plating type label, e.g. "Standard Plating", "Mister Gutsy Plating"
	robotMods?: RobotModPick[]; // up to 3 per rulebook p.184
	vaultNumber?: string; // Vault Dweller
	vaultExperiment?: string; // Vault Dweller — once-per-quest complication reminder
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

export const BODY_LOCATIONS: BodyLocation[] = [
	'head',
	'torso',
	'leftArm',
	'rightArm',
	'leftLeg',
	'rightLeg'
];

export const BODY_LOCATION_LABELS: Record<BodyLocation, string> = {
	head: 'Head',
	torso: 'Torso',
	leftArm: 'Left Arm',
	rightArm: 'Right Arm',
	leftLeg: 'Left Leg',
	rightLeg: 'Right Leg'
};

// Mr. Handy attachment metadata (Core Rulebook p.55 + linked weapon entries).
// Weapon stats are pulled from the base weapon the attachment uses:
//   10mm Auto Pistol → 10mm pistol w/ automatic receiver (p.95)
//   Laser Emitter   → laser gun (p.101)
//   Flamer          → flamer (p.106)
export interface ArmAttachmentMeta {
	label: string;
	isPincer: boolean;
	kind: 'melee' | 'ranged' | 'manipulator';
	skill: SkillKey;
	damageCD: number;
	damageType: DamageType;
	damageEffects: string;
	fireRate?: number;
	range?: string; // C / M / L / X
	ammo?: string;
	qualities?: string;
	notes: string;
	rulebookPage: string;
}

export const ARM_ATTACHMENT_META: Record<ArmAttachment, ArmAttachmentMeta> = {
	pincer: {
		label: 'Pincer',
		isPincer: true,
		kind: 'manipulator',
		skill: 'unarmed',
		damageCD: 2,
		damageType: 'physical',
		damageEffects: '—',
		notes:
			'Manipulate objects (each pincer lifts ≤40 lbs). Required to use Lockpick, Repair, and Throwing.',
		rulebookPage: 'p.55'
	},
	buzzSaw: {
		label: 'Buzz-Saw',
		isPincer: false,
		kind: 'melee',
		skill: 'meleeWeapons',
		damageCD: 3,
		damageType: 'physical',
		damageEffects: 'Piercing 1',
		qualities: 'Melee',
		notes: 'Cut objects or make melee attacks with a circular saw.',
		rulebookPage: 'p.55'
	},
	tenMmAutoPistol: {
		label: '10mm Auto Pistol',
		isPincer: false,
		kind: 'ranged',
		skill: 'smallGuns',
		damageCD: 4,
		damageType: 'physical',
		damageEffects: '—',
		fireRate: 2,
		range: 'C',
		ammo: '10mm',
		qualities: 'Close Quarters, Reliable, Automatic receiver',
		notes:
			'Effectively a 10mm pistol with the automatic receiver mod (p.95). Gutsy units start with 20 rounds.',
		rulebookPage: 'p.55, p.95'
	},
	laserEmitter: {
		label: 'Laser Emitter',
		isPincer: false,
		kind: 'ranged',
		skill: 'energyWeapons',
		damageCD: 4,
		damageType: 'energy',
		damageEffects: 'Piercing 1',
		fireRate: 2,
		range: 'C',
		ammo: 'Fusion Cell',
		qualities: '—',
		notes: 'Laser gun (p.101). Can also be used to cut through objects.',
		rulebookPage: 'p.55, p.101'
	},
	flamer: {
		label: 'Flamer',
		isPincer: false,
		kind: 'ranged',
		skill: 'bigGuns',
		damageCD: 4,
		damageType: 'energy',
		damageEffects: 'Burst, Persistent, Spread',
		fireRate: 4,
		range: 'C',
		ammo: 'Flamer Fuel',
		qualities: 'Two-Handed',
		notes:
			'Sprays an ignited fuel mixture (p.106). Ideal for clearing dead foliage, irritating vermin, and fortified bunkers.',
		rulebookPage: 'p.55, p.106'
	}
};
