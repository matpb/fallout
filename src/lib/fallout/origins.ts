import type { OriginKey, SkillKey } from './types';

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
