import type { SpecialKey } from './types';

export interface PerkRequirement {
	special?: Partial<Record<SpecialKey, number>>;
	level?: number;
	notRobot?: boolean;
}

export interface PerkDef {
	key: string;
	name: string;
	ranks: number;
	requirements: PerkRequirement;
	rankIncrease?: number; // each new rank adds N to level requirement
	text: string;
}

// Subset of the ~70 core perks — most picked + most flavorful.
// Add more later; this covers the common builds.
export const PERKS: PerkDef[] = [
	{
		key: 'actionBoyGirl',
		name: 'Action Boy / Action Girl',
		ranks: 1,
		requirements: {},
		text:
			'When you spend AP to take an additional major action, you do not suffer the increased difficulty during your second action.'
	},
	{
		key: 'adamantiumSkeleton',
		name: 'Adamantium Skeleton',
		ranks: 3,
		requirements: { special: { endurance: 7 }, level: 1 },
		rankIncrease: 3,
		text:
			'When you suffer damage, the amount needed to inflict a critical hit on you increases by your rank in this perk.'
	},
	{
		key: 'aquaboyGirl',
		name: 'Aquaboy / Aquagirl',
		ranks: 2,
		requirements: { special: { endurance: 5 }, level: 1 },
		rankIncrease: 3,
		text:
			'Rank 1: no radiation damage from swimming, hold breath twice as long. Rank 2: enemies +2 difficulty to detect you submerged.'
	},
	{
		key: 'armorer',
		name: 'Armorer',
		ranks: 4,
		requirements: { special: { strength: 5, intelligence: 6 } },
		rankIncrease: 4,
		text:
			'You can modify armor with armor mods. Each rank unlocks an additional rank of mods.'
	},
	{
		key: 'awareness',
		name: 'Awareness',
		ranks: 1,
		requirements: { special: { perception: 7 } },
		text:
			'When you take Aim against a target within Close range, your next attack against that target gains Piercing 1 (or +1 to existing Piercing X).'
	},
	{
		key: 'betterCriticals',
		name: 'Better Criticals',
		ranks: 1,
		requirements: { special: { luck: 9 } },
		text:
			'When you inflict 1+ damage on an enemy, spend 1 Luck Point to automatically inflict a critical hit (and an injury).'
	},
	{
		key: 'bigLeagues',
		name: 'Big Leagues',
		ranks: 1,
		requirements: { special: { strength: 8 } },
		text:
			'When you make a melee attack with a two-handed melee weapon, the weapon gains the Vicious damage effect.'
	},
	{
		key: 'blacksmith',
		name: 'Blacksmith',
		ranks: 3,
		requirements: { special: { strength: 6 }, level: 2 },
		rankIncrease: 4,
		text:
			'You can modify melee weapons with weapon mods. Each rank unlocks an additional rank of mods.'
	},
	{
		key: 'blitz',
		name: 'Blitz',
		ranks: 2,
		requirements: { special: { agility: 9 }, level: 1 },
		rankIncrease: 3,
		text:
			'When you move into reach of an opponent and make a melee attack against them in one turn, re-roll one d20. Rank 2: also +1 CD damage.'
	},
	{
		key: 'bloodyMess',
		name: 'Bloody Mess',
		ranks: 1,
		requirements: { special: { luck: 6 } },
		text:
			'When you inflict a critical hit, roll 1 CD; on an Effect, inflict one additional injury at a random location.'
	},
	{
		key: 'capCollector',
		name: 'Cap Collector',
		ranks: 1,
		requirements: { special: { charisma: 5 } },
		text:
			'When you buy or sell items, you may increase or decrease the price of the goods being traded by 10%.'
	},
	{
		key: 'cautiousNature',
		name: 'Cautious Nature',
		ranks: 1,
		requirements: { special: { perception: 7 } },
		text:
			'Whenever you attempt a skill test and buy 1+ d20s by spending AP, re-roll 1d20 on that test. Mutually exclusive with Daring Nature.'
	},
	{
		key: 'centerMass',
		name: 'Center Mass',
		ranks: 1,
		requirements: { special: { agility: 7 } },
		text:
			'When you make a ranged attack, you may strike the Torso without increasing difficulty, and re-roll 1d20.'
	},
	{
		key: 'chemist',
		name: 'Chemist',
		ranks: 1,
		requirements: { special: { intelligence: 7 } },
		text:
			'Chems you create last twice as long. Unlocks chem recipes that require this perk.'
	},
	{
		key: 'commando',
		name: 'Commando',
		ranks: 2,
		requirements: { special: { agility: 8 }, level: 2 },
		rankIncrease: 3,
		text:
			'When you make a ranged attack with any weapon with Fire Rate 3+ (except heavy weapons), add +1 CD per rank to weapon damage.'
	},
	{
		key: 'daringNature',
		name: 'Daring Nature',
		ranks: 1,
		requirements: { special: { luck: 7 } },
		text:
			'Whenever you attempt a skill test and buy 1+ d20s by giving the GM AP, re-roll 1d20 on that test. Mutually exclusive with Cautious Nature.'
	},
	{
		key: 'demolitionExpert',
		name: 'Demolition Expert',
		ranks: 1,
		requirements: { special: { perception: 6, luck: 6 } },
		text:
			'Attacks with Blast quality gain Vicious. Unlocks explosives recipes.'
	},
	{
		key: 'gunNut',
		name: 'Gun Nut',
		ranks: 4,
		requirements: { special: { intelligence: 5, agility: 5 } },
		rankIncrease: 4,
		text:
			'You can modify ballistic and pipe weapons with weapon mods. Each rank unlocks an additional rank of mods.'
	},
	{
		key: 'inspirational',
		name: 'Inspirational',
		ranks: 3,
		requirements: { special: { charisma: 7 }, level: 2 },
		rankIncrease: 4,
		text:
			'Allies within Close range gain bonuses on their tests when assisting you. The closest "Aura" effect in the system.'
	},
	{
		key: 'lifeGiver',
		name: 'Life Giver',
		ranks: 3,
		requirements: { special: { endurance: 6 }, level: 2 },
		rankIncrease: 5,
		text: 'Increase your maximum Health Points by +3 per rank.'
	},
	{
		key: 'medic',
		name: 'Medic',
		ranks: 3,
		requirements: { special: { intelligence: 6 } },
		rankIncrease: 4,
		text:
			'Stimpaks and RadAway you administer (Take Chem or First Aid) heal an additional 2 HP per rank, or remove an additional 2 RAD per rank.'
	},
	{
		key: 'misterSandman',
		name: 'Mister Sandman',
		ranks: 1,
		requirements: { special: { agility: 7 } },
		text:
			'Sneak attacks with silenced weapons or melee/unarmed attacks gain extra damage and Vicious.'
	},
	{
		key: 'nerdRage',
		name: 'Nerd Rage!',
		ranks: 1,
		requirements: { special: { intelligence: 8 } },
		text:
			'When your HP are below 20% maximum, increase your damage and damage resistance.'
	},
	{
		key: 'paralyzingPalm',
		name: 'Paralyzing Palm',
		ranks: 1,
		requirements: { special: { strength: 8 } },
		text:
			'When you make an unarmed attack and choose to strike a specific location, your attack gains the Stun damage effect.'
	},
	{
		key: 'piercingStrike',
		name: 'Piercing Strike',
		ranks: 1,
		requirements: { special: { strength: 7 } },
		text:
			'Your unarmed attacks and bladed melee weapons gain Piercing 1 (or +1 to existing Piercing X).'
	},
	{
		key: 'pickpocket',
		name: 'Pickpocket',
		ranks: 3,
		requirements: { special: { perception: 8, agility: 8 }, level: 1 },
		rankIncrease: 3,
		text:
			'Rank 1: ignore first complication on AGI+Sneak steal/plant tests. Rank 2: re-roll 1d20. Rank 3: -1 difficulty.'
	},
	{
		key: 'pyromaniac',
		name: 'Pyromaniac',
		ranks: 3,
		requirements: { special: { endurance: 6 }, level: 2 },
		rankIncrease: 4,
		text: 'Damage with fire weapons increases by +1 CD per rank.'
	},
	{
		key: 'quickHands',
		name: 'Quick Hands',
		ranks: 1,
		requirements: { special: { agility: 8 } },
		text:
			'When you make a ranged attack, spend 2 AP to increase the Fire Rate of your gun by +2 for that attack.'
	},
	{
		key: 'radResistance',
		name: 'Rad Resistance',
		ranks: 2,
		requirements: { special: { endurance: 8 }, level: 1 },
		rankIncrease: 4,
		text: 'Radiation Damage Resistance to all hit locations increases by +1 per rank.'
	},
	{
		key: 'refractor',
		name: 'Refractor',
		ranks: 2,
		requirements: { special: { perception: 6, luck: 7 }, level: 1 },
		rankIncrease: 4,
		text: 'Energy Damage Resistance to all hit locations increases by +1 per rank.'
	},
	{
		key: 'rifleman',
		name: 'Rifleman',
		ranks: 2,
		requirements: { special: { agility: 7 }, level: 2 },
		rankIncrease: 4,
		text:
			'Ranged attack with any two-handed Fire Rate 2 or lower (except heavy) weapon: +1 CD per rank. Rank 2: also +Piercing 1.'
	},
	{
		key: 'roboticsExpert',
		name: 'Robotics Expert',
		ranks: 3,
		requirements: { special: { intelligence: 8 }, level: 2 },
		rankIncrease: 4,
		text:
			'Modify robot armor/weapons/modules. Reduce difficulty of robot repair tests. Rank 3: reprogram robots.'
	},
	{
		key: 'science',
		name: 'Science!',
		ranks: 4,
		requirements: { special: { intelligence: 6 }, level: 2 },
		rankIncrease: 4,
		text:
			'Modify energy weapons with weapon mods. Craft advanced armor mods. Each rank unlocks an additional rank of mods.'
	},
	{
		key: 'scoundrel',
		name: 'Scoundrel',
		ranks: 1,
		requirements: { special: { charisma: 7 } },
		text:
			'When you make a CHA+Speech test to convince someone of a lie, you may ignore the first complication you roll.'
	},
	{
		key: 'shotgunSurgeon',
		name: 'Shotgun Surgeon',
		ranks: 1,
		requirements: { special: { strength: 5, agility: 7 } },
		text:
			'Your ranged attacks with shotguns gain Piercing 1 (or +1 to existing Piercing X).'
	},
	{
		key: 'sizeMatters',
		name: 'Size Matters',
		ranks: 3,
		requirements: { special: { endurance: 7, agility: 6 } },
		rankIncrease: 4,
		text: 'When you make a ranged attack with any heavy weapon, +1 CD per rank to damage.'
	},
	{
		key: 'slayer',
		name: 'Slayer',
		ranks: 1,
		requirements: { special: { strength: 8 } },
		text:
			'When you inflict any damage with an unarmed attack or melee weapon, spend 1 Luck Point to immediately inflict a critical hit + injury at the location hit. (Mechanical Smite.)'
	},
	{
		key: 'smoothTalker',
		name: 'Smooth Talker',
		ranks: 1,
		requirements: { special: { charisma: 6 } },
		text: 'When you make a Barter or Speech test as part of an opposed test, re-roll 1d20.'
	},
	{
		key: 'sniper',
		name: 'Sniper',
		ranks: 1,
		requirements: { special: { perception: 8, agility: 6 } },
		text:
			'When you take Aim and then make a ranged attack with a two-handed Accurate weapon, you can specify a hit location without increasing difficulty.'
	},
	{
		key: 'solarPowered',
		name: 'Solar Powered',
		ranks: 1,
		requirements: { special: { endurance: 7 } },
		text: 'For every hour you spend in direct sunlight, heal 1 radiation damage.'
	},
	{
		key: 'steadyAim',
		name: 'Steady Aim',
		ranks: 1,
		requirements: { special: { strength: 8, agility: 7 } },
		text:
			'When you take Aim, either re-roll 2d20 on the first attack this turn, or re-roll 1d20 on all attacks this turn.'
	},
	{
		key: 'strongBack',
		name: 'Strong Back',
		ranks: 3,
		requirements: { special: { strength: 5 }, level: 1 },
		rankIncrease: 2,
		text: 'Maximum carry weight is increased by +25 lbs per rank.'
	},
	{
		key: 'tag',
		name: 'Tag!',
		ranks: 1,
		requirements: { level: 5 },
		text:
			'Select one additional Tag skill. Increase its rank by 2 (max 6) and mark it as a Tag skill.'
	},
	{
		key: 'terrifyingPresence',
		name: 'Terrifying Presence',
		ranks: 2,
		requirements: { special: { strength: 6, charisma: 8 }, level: 3 },
		rankIncrease: 5,
		text:
			'When you make a Speech test to threaten/scare someone, re-roll 1d20. Rank 2: a major action to STR+Speech (DC 2) forces the enemy to move away on their next turn.'
	},
	{
		key: 'toughness',
		name: 'Toughness',
		ranks: 2,
		requirements: { special: { endurance: 6, luck: 6 }, level: 1 },
		rankIncrease: 4,
		text: 'Physical Damage Resistance to all hit locations increases by +1 per rank.'
	}
];

export const PERKS_BY_KEY: Record<string, PerkDef> = Object.fromEntries(
	PERKS.map((p) => [p.key, p])
);
