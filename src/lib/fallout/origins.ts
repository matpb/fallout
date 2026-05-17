import type { ArmAttachment, MisterHandyVariant, OriginKey, SkillKey } from './types';

export interface OriginDef {
	key: OriginKey;
	name: string;
	tagline: string;
	traitName: string;
	traitText: string;
	maxSpecialOverrides?: Partial<Record<string, number>>;
	specialBonuses?: Partial<Record<string, number>>;
	maxSkillRank?: number;
	extraTagSkillFrom?: SkillKey[]; // brotherhood
	extraTagSkill?: SkillKey | 'any'; // vault dweller
	radImmune?: boolean;
	poisonImmune?: boolean;
	notes: string[];
}

export const ORIGINS: OriginDef[] = [
	{
		key: 'brotherhood',
		name: 'Brotherhood Initiate',
		tagline: 'Tech-zealot soldier of the steel order. Bound by the Chain that Binds.',
		traitName: 'The Chain that Binds',
		traitText:
			'You gain one additional Tag skill, which must be one of Energy Weapons, Science, or Repair. As a member of the Brotherhood of Steel, you must carry out the orders of your immediate superiors.',
		extraTagSkillFrom: ['energyWeapons', 'science', 'repair'],
		notes: [
			'Bound by chain of command — disobedience = expulsion + tech reclamation',
			'Best for paladin-style players',
			'Equipment packs: Initiate, Scribe'
		]
	},
	{
		key: 'ghoul',
		name: 'Ghoul',
		tagline: 'Necrotic post-human. Healed by radiation, slow to age, sterile.',
		traitName: 'Necrotic Post-Human',
		traitText:
			'You are immune to radiation damage. In fact, you are healed by it — you regain 1 HP for every 3 points of radiation damage inflicted upon you. Survival becomes a Tag skill, increasing it by 2 ranks. You may face discrimination from "smoothskins."',
		radImmune: true,
		extraTagSkill: 'any', // Survival becomes Tag, but the trait gives Survival as Tag specifically
		notes: [
			'Survival is auto-Tag at +2',
			'+1 HP per 3 radiation damage taken',
			'Re-roll injury healing dice when resting in irradiated area',
			'CHA tests vs smoothskins may have higher difficulty/complication range'
		]
	},
	{
		key: 'superMutant',
		name: 'Super Mutant',
		tagline: 'F.E.V.-mutated, towering, brutally strong. Sterile. Limited intellect.',
		traitName: 'Forced Evolution',
		traitText:
			'Initial Strength and Endurance are increased by +2 each. Maximum Strength and Endurance are 12, but maximum Intelligence and Charisma are 6. You may not have more than 4 ranks in any skill. You are completely immune to radiation and poison damage.',
		specialBonuses: { strength: 2, endurance: 2 },
		maxSpecialOverrides: { strength: 12, endurance: 12, intelligence: 6, charisma: 6 },
		maxSkillRank: 4,
		radImmune: true,
		poisonImmune: true,
		notes: [
			'Skill cap = 4',
			'Only Super Mutant–fitted armor',
			'7+ feet tall, green/yellow/grey skin'
		]
	},
	{
		key: 'misterHandy',
		name: 'Mister Handy',
		tagline: 'Hovering robotic butler/soldier with three arm attachments.',
		traitName: 'Mister Handy Robot',
		traitText:
			'360° vision. Reduce difficulty of Perception tests by 1. Immune to radiation/poison. Cannot use chems, food, or rest. Carry weight fixed at 150 lbs (no STR scaling). Three arm attachments. No pincer = no unarmed/manipulate, no Lockpick/Repair/Throwing.',
		radImmune: true,
		poisonImmune: true,
		notes: [
			'Custom hit-location table (Optics/Body/3 Arms/Thruster)',
			'Cannot heal naturally — needs repairs (INT+Repair)',
			'Cannot use Stimpaks; uses Robot Repair Kits instead',
			'Variants: Miss Nanny, Mister Gutsy, Mister Farmhand, Nurse Handy'
		]
	},
	{
		key: 'survivor',
		name: 'Survivor',
		tagline: 'Wasteland-born. Most flexible origin — pick 2 traits or 1 trait + 1 perk.',
		traitName: 'Survivor Traits',
		traitText:
			'Choose two of: Educated (extra Tag skill, fail = GM gains 1 AP), Fast Shot (2nd ranged major action costs 1 AP, no Aim), Gifted (+1 to two SPECIAL, max Luck Points -1), Heavy Handed (+1 CD melee damage, melee complication 19-20), Small Frame (re-roll AGI balance/contortion, lower carry weight). Or pick 1 trait + 1 extra perk.',
		notes: [
			'Includes NCR, Minutemen, Regulators, raiders-turned-good',
			'Equipment packs: Mercenary, Trader, Wanderer, Settler, Raider'
		]
	},
	{
		key: 'vaultDweller',
		name: 'Vault Dweller',
		tagline: 'Sheltered, healthy, often the unwitting subject of a vault experiment.',
		traitName: 'Vault Kid',
		traitText:
			'Reduce the difficulty of all END tests to resist disease. You have one additional Tag skill of your choice. Once per quest the GM may introduce a vault-experiment complication; if so, regain one Luck Point.',
		extraTagSkill: 'any',
		notes: [
			'Free from mutation/disease at start',
			'Can optionally be a Ghoul Vault Dweller (swap to Necrotic Post-Human)',
			'Equipment packs: Vault-Tec Resident, Vault-Tec Security'
		]
	}
];

export const ORIGIN_BY_KEY: Record<OriginKey, OriginDef> = Object.fromEntries(
	ORIGINS.map((o) => [o.key, o])
) as Record<OriginKey, OriginDef>;

export interface SurvivorTraitDef {
	key: string;
	name: string;
	benefit: string;
	penalty: string;
}

// Mister Handy chassis variants — Core Rulebook p.76-77.
// Each variant has a fixed loadout of 3 arm attachments and some flavor.
export interface MisterHandyVariantDef {
	key: MisterHandyVariant;
	name: string;
	persona: string;
	attachments: ArmAttachment[]; // length 3
	plating: string;
	startingCaps: number;
	extras: string[];
}

export const MISTER_HANDY_VARIANTS: MisterHandyVariantDef[] = [
	{
		key: 'misterHandy',
		name: 'Mister Handy',
		persona: 'Domestic butler. Stereotypical British masculine voice.',
		attachments: ['pincer', 'flamer', 'laserEmitter'],
		plating: 'Standard plating',
		startingCaps: 10,
		extras: ['Robot repair kit', 'Integral boiler mod']
	},
	{
		key: 'misterGutsy',
		name: 'Mister Gutsy',
		persona: 'Military model. Drill-sergeant masculine voice. Heavier armor.',
		attachments: ['tenMmAutoPistol', 'buzzSaw', 'laserEmitter'],
		plating: 'Mister Gutsy plating',
		startingCaps: 10,
		extras: ['Recon sensors mod']
	},
	{
		key: 'missNanny',
		name: 'Miss Nanny',
		persona: 'Caretaker / nanny. Feminine voice.',
		attachments: ['pincer', 'flamer', 'buzzSaw'],
		plating: 'Standard plating',
		startingCaps: 10,
		extras: ['Behavioral analysis mod', 'Hazard detection mod']
	},
	{
		key: 'misterFarmhand',
		name: 'Mister Farmhand',
		persona: 'Farm helper. Stereotypically rural masculine voice.',
		attachments: ['pincer', 'buzzSaw', 'laserEmitter'],
		plating: 'Standard plating',
		startingCaps: 25,
		extras: ['One bag of fertilizer (1 uncommon material)', '2 mutfruits']
	},
	{
		key: 'nurseHandy',
		name: 'Nurse Handy',
		persona: 'Medical model (Doctor Handy, MD. line). Masculine voice.',
		attachments: ['pincer', 'buzzSaw', 'flamer'],
		plating: 'Standard plating',
		startingCaps: 10,
		extras: ['Stimpak', 'Diagnosis mod']
	}
];

export const MISTER_HANDY_VARIANT_BY_KEY: Record<MisterHandyVariant, MisterHandyVariantDef> =
	Object.fromEntries(MISTER_HANDY_VARIANTS.map((v) => [v.key, v])) as Record<
		MisterHandyVariant,
		MisterHandyVariantDef
	>;

// Robot Mods catalog — Core Rulebook p.184-185 (text condensed, mechanics intact).
export interface RobotModDef {
	key: string;
	name: string;
	effect: string;
}

export const ROBOT_MODS: RobotModDef[] = [
	{
		key: 'behavioralAnalysis',
		name: 'Behavioral Analysis Mod',
		effect: 'Reduce the difficulty of Speech tests by 1 (min. 0).'
	},
	{
		key: 'diagnosis',
		name: 'Diagnosis Mod',
		effect: 'Reduce the difficulty of Medicine tests by 1 (min. 0).'
	},
	{
		key: 'hackingModule',
		name: 'Hacking Module',
		effect:
			'Reduce the difficulty of Science tests to hack into locked computer systems by 1 (min. 0).'
	},
	{
		key: 'hazardDetection',
		name: 'Hazard Detection Mod',
		effect:
			'Reduce the difficulty of Survival tests to detect and disable traps and similar hazards by 1 (min. 0).'
	},
	{
		key: 'integralBoiler',
		name: 'Integral Boiler Mod',
		effect:
			'Once per scene out of combat, turn 2 dirty waters into 1 purified water in ten minutes.'
	},
	{
		key: 'lockpickModule',
		name: 'Lockpick Module',
		effect:
			'Reduce the difficulty of Lockpick tests by 1 (min. 0). Does not need bobby pins or other lockpicking tools.'
	},
	{
		key: 'radiationCoils',
		name: 'Radiation Coils',
		effect:
			'Can turn on or off at the start of a turn. While on, all creatures within Reach suffer 3 CD Radiation damage at the end of the robot\'s turn.'
	},
	{
		key: 'reconSensors',
		name: 'Recon Sensors',
		effect:
			'Reduce difficulty of tests to detect hidden opponents by 1 (min. 0). Enemies visible to you who attempt to hide add +1 to the difficulty of their Sneak tests.'
	},
	{
		key: 'regenerationField',
		name: 'Regeneration Field',
		effect:
			'Outside of combat, allies regain 2 HP at the start of each scene you are present within.'
	},
	{
		key: 'resistanceField',
		name: 'Resistance Field',
		effect: 'Allies within Close range receive +2 Physical damage resistance.'
	},
	{
		key: 'sensorArray',
		name: 'Sensor Array',
		effect:
			'Re-roll 1d20 on all PER tests. May attempt PER tests to detect things which cannot normally be detected by the naked eye, such as radiation.'
	},
	{
		key: 'stealthField',
		name: 'Stealth Field',
		effect: 'Allies within Close range may re-roll 1d20 on Stealth tests.'
	},
	{
		key: 'teslaCoils',
		name: 'Tesla Coils',
		effect:
			'Can turn on or off at the start of a turn. While on, all enemies within Reach suffer 4 CD Piercing 1, Stun Energy damage at the end of the robot\'s turn.'
	}
];

export const ROBOT_MOD_BY_KEY: Record<string, RobotModDef> = Object.fromEntries(
	ROBOT_MODS.map((m) => [m.key, m])
);

// Robot plating catalog (Core Rulebook p.145-147).
// Plating covers the whole robot — Optics, Main Body, Arms, Thruster — and provides
// physical/energy damage resistance plus special effects on some plates.
export interface RobotPlatingDef {
	key: string;
	name: string;
	dr: { physical: number; energy: number };
	carryWeightDelta: number; // applied vs base 150 lbs Mr Handy carry
	special?: string; // melee complication / energy bonus / etc.
	notes: string;
}

export const ROBOT_PLATING_CATALOG: RobotPlatingDef[] = [
	{
		key: 'standard',
		name: 'Standard Plating',
		dr: { physical: 0, energy: 0 },
		carryWeightDelta: 0,
		notes:
			'Default factory plating shipped with all brand-new Mister Handy models. No cost, no bonus.'
	},
	{
		key: 'gutsy',
		name: 'Mister Gutsy Plating',
		dr: { physical: 0, energy: 0 },
		carryWeightDelta: 0,
		special: 'Better thermal absorption — reinforced against energy weaponry.',
		notes: 'Default plating for the Mister Gutsy military variant.'
	},
	{
		key: 'factory',
		name: 'Factory Armor',
		dr: { physical: 1, energy: 1 },
		carryWeightDelta: 0,
		notes:
			'Standardized factory-made plating designed to fit any Mister Handy model. +1 PHY/+1 ENR per fitted location.'
	},
	{
		key: 'factoryStorage',
		name: 'Factory Storage Armor',
		dr: { physical: 1, energy: 1 },
		carryWeightDelta: 20,
		notes:
			'Like factory armor but with additional storage compartments. Main Body only. Armorer 1 to install.'
	},
	{
		key: 'primal',
		name: 'Primal Plate',
		dr: { physical: 2, energy: 0 },
		carryWeightDelta: -10,
		notes:
			'Makeshift bulk armor providing extra physical protection. Reduces carry weight (-10/-20 per location).'
	},
	{
		key: 'serrated',
		name: 'Serrated Plate',
		dr: { physical: 2, energy: 0 },
		carryWeightDelta: -10,
		special:
			'If a melee attacker against a serrated location suffers a complication, they take 2 CD Persistent (Physical) damage. Arms fitted with serrated plate gain the Persistent (Physical) damage effect on melee attacks.',
		notes: 'Makeshift, jagged. Armorer 1 to install.'
	},
	{
		key: 'noxious',
		name: 'Noxious Plate',
		dr: { physical: 2, energy: 0 },
		carryWeightDelta: -10,
		special:
			'If a melee attacker against a noxious location suffers a complication, they take 2 CD Persistent (Poison) damage. Arms fitted with noxious plate gain Persistent (Poison) on melee attacks.',
		notes: 'Coated in toxic materials. Armorer 1 to install.'
	},
	{
		key: 'toxic',
		name: 'Toxic Plate',
		dr: { physical: 2, energy: 0 },
		carryWeightDelta: -10,
		special:
			'If a melee attacker against a toxic location suffers a complication, they take 2 CD Radiation damage. Arms fitted with toxic plate gain the Radioactive damage effect on melee attacks.',
		notes: 'Makeshift, irradiated metal plating.'
	},
	{
		key: 'actuated',
		name: 'Actuated Frame',
		dr: { physical: 1, energy: 0 },
		carryWeightDelta: 0,
		special:
			'Melee attacks from arms fitted with an actuated frame inflict +1 CD damage. If the Thruster is fitted, you may make both a Move minor action and a Sprint major action in the same turn.'
	, notes: 'Specially made plates fitted with actuators and motive systems.'
	},
	{
		key: 'voltaic',
		name: 'Voltaic Frame',
		dr: { physical: 0, energy: 1 },
		carryWeightDelta: 0,
		special:
			'Any energy-damage attack inflicts +1 CD if any location has Voltaic Frame; +1 more for every two additional fitted locations.',
		notes: 'Conduits and capacitors woven into the plating.'
	}
];

export const ROBOT_PLATING_BY_KEY: Record<string, RobotPlatingDef> = Object.fromEntries(
	ROBOT_PLATING_CATALOG.map((p) => [p.key, p])
);

// Quick-pick string list — used as buttons. Plating is stored on the character
// as free-text `misterHandyPlating`; we match by name to find the catalog entry.
export const ROBOT_PLATING_PRESETS: string[] = ROBOT_PLATING_CATALOG.map((p) => p.name);

export function findPlatingDef(name: string | undefined): RobotPlatingDef | null {
	if (!name) return null;
	const trimmed = name.trim().toLowerCase();
	return (
		ROBOT_PLATING_CATALOG.find((p) => p.name.toLowerCase() === trimmed) ?? null
	);
}

export const SURVIVOR_TRAITS: SurvivorTraitDef[] = [
	{
		key: 'educated',
		name: 'Educated',
		benefit: 'You have one additional Tag skill.',
		penalty: 'When you fail a skill test using a non-Tag skill, the GM gains 1 AP.'
	},
	{
		key: 'fastShot',
		name: 'Fast Shot',
		benefit:
			'A 2nd major action used for a ranged attack only costs 1 AP (instead of 2).',
		penalty: 'You cannot benefit from the Aim minor action.'
	},
	{
		key: 'gifted',
		name: 'Gifted',
		benefit: 'Choose two SPECIAL attributes and increase each by +1.',
		penalty: 'Your maximum Luck Points is one fewer than your Luck attribute.'
	},
	{
		key: 'heavyHanded',
		name: 'Heavy Handed',
		benefit: 'Your Melee Damage bonus increases by +1 CD.',
		penalty: 'Your melee/unarmed attacks complicate on 19 or 20, not just 20.'
	},
	{
		key: 'smallFrame',
		name: 'Small Frame',
		benefit:
			'Re-roll 1d20 on all AGI tests that rely on balance or contortion.',
		penalty: 'Carry weight is 150 + (5 × STR) lbs instead of 150 + (10 × STR).'
	}
];
