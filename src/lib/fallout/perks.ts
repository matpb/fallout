import type { SpecialKey } from './types';

export interface PerkRequirement {
	special?: Partial<Record<SpecialKey, number>>;
	level?: number;
	notRobot?: boolean;
}

export type PerkCategory =
	| 'combat'
	| 'defense'
	| 'tactical'
	| 'crit'
	| 'stealth'
	| 'crafting'
	| 'social'
	| 'utility'
	| 'survival';

export const CATEGORY_LABELS: Record<PerkCategory, string> = {
	combat: 'Combat — weapon damage',
	defense: 'Defense — soak more',
	tactical: 'Tactical — action economy',
	crit: 'Crit & Luck',
	stealth: 'Stealth & thievery',
	crafting: 'Crafting & modding',
	social: 'Social — talk & barter',
	utility: 'Utility & exploration',
	survival: 'Survivability — healing & resistance'
};

export interface PerkDef {
	key: string;
	name: string;
	ranks: number;
	category: PerkCategory;
	requirements: PerkRequirement;
	rankIncrease?: number; // each new rank adds N to level requirement
	text: string;
	flavor?: string; // 1-line "when to pick this" tip for new players
}

// Subset of the ~70 core perks — most picked + most flavorful.
export const PERKS: PerkDef[] = [
	{
		key: 'actionBoyGirl',
		name: 'Action Boy / Action Girl',
		ranks: 1,
		category: 'tactical',
		requirements: {},
		text: 'When you spend AP to take an additional major action, you do not suffer the +1 difficulty on that second action.',
		flavor: 'For action-economy fiends. Lets you double-tap attacks without penalty.'
	},
	{
		key: 'adamantiumSkeleton',
		name: 'Adamantium Skeleton',
		ranks: 3,
		category: 'defense',
		requirements: { special: { endurance: 7 }, level: 1 },
		rankIncrease: 3,
		text: 'When you suffer damage, the amount needed to inflict a critical hit on you increases by your rank in this perk. (Crits trigger at 5+ damage by default; rank 1 makes it 6+, rank 2 makes it 7+, rank 3 makes it 8+.)',
		flavor: 'Wear this on tanks. Avoiding the injury that comes with a crit > soaking the damage.'
	},
	{
		key: 'aquaboyGirl',
		name: 'Aquaboy / Aquagirl',
		ranks: 2,
		category: 'utility',
		requirements: { special: { endurance: 5 }, level: 1 },
		rankIncrease: 3,
		text: 'Rank 1: no radiation damage from swimming, hold breath twice as long. Rank 2: enemies +2 difficulty to detect you while submerged.',
		flavor: 'Niche but life-saving in coastal/river campaigns.'
	},
	{
		key: 'armorer',
		name: 'Armorer',
		ranks: 4,
		category: 'crafting',
		requirements: { special: { strength: 5, intelligence: 6 } },
		rankIncrease: 4,
		text: 'You can modify armor with armor mods. Each rank unlocks an additional rank of mods (rank 1 = mods rank 1; rank 4 = all mods including ballistic weave Mk V, shielded lining, etc.).',
		flavor: 'Pick up if you (or any party member) wears Power Armor. Pairs with Science!.'
	},
	{
		key: 'awareness',
		name: 'Awareness',
		ranks: 1,
		category: 'tactical',
		requirements: { special: { perception: 7 } },
		text: 'When you take the Aim minor action against a target within Close range, your next attack against that target gains the Piercing 1 damage effect (or improves an existing Piercing X by +1).',
		flavor: 'Great for energy-weapon snipers — Aim already re-rolls a d20, this stacks armor-bypass on top.'
	},
	{
		key: 'betterCriticals',
		name: 'Better Criticals',
		ranks: 1,
		category: 'crit',
		requirements: { special: { luck: 9 } },
		text: 'When you inflict 1+ damage on an enemy, spend 1 Luck Point to automatically inflict a critical hit (and an injury).',
		flavor: 'The "Smite" perk for ranged builds. Need LCK 9, but turns any hit into an injury on demand.'
	},
	{
		key: 'bigLeagues',
		name: 'Big Leagues',
		ranks: 1,
		category: 'combat',
		requirements: { special: { strength: 8 } },
		text: 'When you make a melee attack with a two-handed melee weapon, the weapon gains the Vicious damage effect (+1 damage per Combat Dice Effect rolled).',
		flavor: 'For super sledge / sledgehammer / fire axe builds. Free damage every Effect roll.'
	},
	{
		key: 'blacksmith',
		name: 'Blacksmith',
		ranks: 3,
		category: 'crafting',
		requirements: { special: { strength: 6 }, level: 2 },
		rankIncrease: 4,
		text: 'You can modify melee weapons with weapon mods. Each rank unlocks an additional rank of mods.',
		flavor: 'Skip unless your party plans on melee weapons that benefit from mods (machete, super sledge, etc.).'
	},
	{
		key: 'blitz',
		name: 'Blitz',
		ranks: 2,
		category: 'combat',
		requirements: { special: { agility: 9 }, level: 1 },
		rankIncrease: 3,
		text: 'When you move into reach of an opponent and make a melee attack against them in the same turn, re-roll one d20. Rank 2: also +1 CD damage on that attack.',
		flavor: 'AGI 9+ melee dancers — close the gap and slash. Pairs with Slayer for instant injuries.'
	},
	{
		key: 'bloodyMess',
		name: 'Bloody Mess',
		ranks: 1,
		category: 'crit',
		requirements: { special: { luck: 6 } },
		text: 'When you inflict a critical hit, roll 1 CD; on an Effect, inflict one additional injury at a random location.',
		flavor: 'Cheap LCK perk that turns crits even nastier. Stack with Better Criticals or Slayer.'
	},
	{
		key: 'capCollector',
		name: 'Cap Collector',
		ranks: 1,
		category: 'social',
		requirements: { special: { charisma: 5 } },
		text: 'When you buy or sell items, you may shift the price by 10% in your favor. Stacks with Barter haggling.',
		flavor: 'Trader build essential. Pays for itself within a few transactions.'
	},
	{
		key: 'cautiousNature',
		name: 'Cautious Nature',
		ranks: 1,
		category: 'tactical',
		requirements: { special: { perception: 7 } },
		text: 'Whenever you attempt a skill test and buy 1+ d20s by spending Action Points, re-roll 1d20 on that test. Mutually exclusive with Daring Nature.',
		flavor: 'For "save your AP, spend it carefully" players. The yin to Daring Nature\'s yang.'
	},
	{
		key: 'centerMass',
		name: 'Center Mass',
		ranks: 1,
		category: 'tactical',
		requirements: { special: { agility: 7 } },
		text: 'When you make a ranged attack, you may target the Torso (largest hit location) without the +1 difficulty for choosing a location, AND re-roll 1d20.',
		flavor: 'Almost always-on damage boost for any gunslinger. Easy pick.'
	},
	{
		key: 'chemist',
		name: 'Chemist',
		ranks: 1,
		category: 'crafting',
		requirements: { special: { intelligence: 7 } },
		text: 'Chems you create last twice as long. Unlocks chem recipes that have this perk as a requirement (Antibiotics, Buffjet, Bufftats, Fury, Glowing Blood Pack, Jet Fuel, Overdrive, etc.).',
		flavor: 'For brewers and addicts. Especially valuable on long expeditions away from traders.'
	},
	{
		key: 'commando',
		name: 'Commando',
		ranks: 2,
		category: 'combat',
		requirements: { special: { agility: 8 }, level: 2 },
		rankIncrease: 3,
		text: 'When you make a ranged attack with any weapon with Fire Rate 3+ (except heavy weapons), add +1 CD per rank to weapon damage.',
		flavor: 'Automatic-rifle and SMG mainline. The "spray and pray" damage perk.'
	},
	{
		key: 'daringNature',
		name: 'Daring Nature',
		ranks: 1,
		category: 'tactical',
		requirements: { special: { luck: 7 } },
		text: 'Whenever you attempt a skill test and buy 1+ d20s by GIVING the GM Action Points (i.e., when the group AP pool is empty), re-roll 1d20. Mutually exclusive with Cautious Nature.',
		flavor: 'For "live dangerously" players. Punches above its weight in low-AP games.'
	},
	{
		key: 'demolitionExpert',
		name: 'Demolition Expert',
		ranks: 1,
		category: 'combat',
		requirements: { special: { perception: 6, luck: 6 } },
		text: 'Attacks with the Blast quality (grenades, mines, missile launchers, Fat Man) gain Vicious. Unlocks explosives recipes.',
		flavor: 'Grenadier essential. Free damage on every blast Effect.'
	},
	{
		key: 'gunNut',
		name: 'Gun Nut',
		ranks: 4,
		category: 'crafting',
		requirements: { special: { intelligence: 5, agility: 5 } },
		rankIncrease: 4,
		text: 'You can modify ballistic and pipe weapons with weapon mods. Each rank unlocks an additional rank of mods.',
		flavor: 'Almost mandatory if anyone in the party uses Small Guns / Big Guns. The most-picked crafting perk.'
	},
	{
		key: 'inspirational',
		name: 'Inspirational',
		ranks: 3,
		category: 'social',
		requirements: { special: { charisma: 7 }, level: 2 },
		rankIncrease: 4,
		text: 'Allies within Close range gain bonuses on their tests when assisting you. The closest "Aura of Courage" effect in the system.',
		flavor: 'Party leader / paladin / warlord pick. Multiplies the whole table\'s effectiveness.'
	},
	{
		key: 'lifeGiver',
		name: 'Life Giver',
		ranks: 3,
		category: 'survival',
		requirements: { special: { endurance: 6 }, level: 2 },
		rankIncrease: 5,
		text: 'Increase your maximum Health Points by +3 per rank.',
		flavor: 'Tank insurance. Nine extra HP at rank 3 is a lot when default HP totals run END+LCK ≈ 10–15.'
	},
	{
		key: 'medic',
		name: 'Medic',
		ranks: 3,
		category: 'survival',
		requirements: { special: { intelligence: 6 } },
		rankIncrease: 4,
		text: 'Stimpaks and RadAway you administer (Take Chem or First Aid) heal an additional 2 HP per rank, or remove an additional 2 RAD per rank.',
		flavor: 'Party healer essential. Triples Stimpak value at rank 3 (4 HP base + 6 = 10).'
	},
	{
		key: 'misterSandman',
		name: 'Mister Sandman',
		ranks: 1,
		category: 'stealth',
		requirements: { special: { agility: 7 } },
		text: 'Sneak attacks with silenced weapons, melee, or unarmed attacks gain extra damage and Vicious.',
		flavor: 'Stealth-archer / assassin pick. Combines beautifully with Sneak Tag and Slayer.'
	},
	{
		key: 'nerdRage',
		name: 'Nerd Rage!',
		ranks: 1,
		category: 'combat',
		requirements: { special: { intelligence: 8 } },
		text: 'When your HP are below 20% maximum, increase your damage and damage resistance.',
		flavor: 'Last-stand button. INT 8 means you\'re probably a smart character — but bleeding scientists hit hard.'
	},
	{
		key: 'paralyzingPalm',
		name: 'Paralyzing Palm',
		ranks: 1,
		category: 'combat',
		requirements: { special: { strength: 8 } },
		text: 'When you make an unarmed attack and choose to strike a specific location (+1 difficulty), your attack gains the Stun damage effect.',
		flavor: 'Unarmed brawler must-have. Stun = enemy loses normal actions next turn.'
	},
	{
		key: 'piercingStrike',
		name: 'Piercing Strike',
		ranks: 1,
		category: 'combat',
		requirements: { special: { strength: 7 } },
		text: 'Your unarmed attacks and bladed melee weapons (knife, machete, sword) gain Piercing 1 (or +1 to existing Piercing X).',
		flavor: 'Knife/sword melee builds — bypasses 1 point of armor per Effect rolled.'
	},
	{
		key: 'pickpocket',
		name: 'Pickpocket',
		ranks: 3,
		category: 'stealth',
		requirements: { special: { perception: 8, agility: 8 }, level: 1 },
		rankIncrease: 3,
		text: 'Rank 1: ignore the first complication on AGI+Sneak steal/plant tests. Rank 2: re-roll 1d20. Rank 3: -1 difficulty.',
		flavor: 'Real-rogue pick — the only perk specifically for thieving. Plant a grenade on a raider, walk away.'
	},
	{
		key: 'pyromaniac',
		name: 'Pyromaniac',
		ranks: 3,
		category: 'combat',
		requirements: { special: { endurance: 6 }, level: 2 },
		rankIncrease: 4,
		text: 'Damage with fire weapons (flamer, Molotov, incinerator) increases by +1 CD per rank.',
		flavor: 'Flamer specialist. Synergizes with Persistent damage on flamer weapons.'
	},
	{
		key: 'quickHands',
		name: 'Quick Hands',
		ranks: 1,
		category: 'tactical',
		requirements: { special: { agility: 8 } },
		text: 'When you make a ranged attack, spend 2 AP to increase the Fire Rate of your gun by +2 for that attack.',
		flavor: 'Burst-fire enabler. Letting you dump more ammo for more damage dice on demand.'
	},
	{
		key: 'radResistance',
		name: 'Rad Resistance',
		ranks: 2,
		category: 'defense',
		requirements: { special: { endurance: 8 }, level: 1 },
		rankIncrease: 4,
		text: 'Radiation Damage Resistance to all hit locations increases by +1 per rank.',
		flavor: 'Critical for non-ghoul characters in irradiated zones. Rad reduces MAX HP, can\'t be healed naturally.'
	},
	{
		key: 'refractor',
		name: 'Refractor',
		ranks: 2,
		category: 'defense',
		requirements: { special: { perception: 6, luck: 7 }, level: 1 },
		rankIncrease: 4,
		text: 'Energy Damage Resistance to all hit locations increases by +1 per rank.',
		flavor: 'Soaking laser/plasma damage. Most armor stacks poor energy DR; this fills the gap.'
	},
	{
		key: 'rifleman',
		name: 'Rifleman',
		ranks: 2,
		category: 'combat',
		requirements: { special: { agility: 7 }, level: 2 },
		rankIncrease: 4,
		text: 'Ranged attack with any two-handed Fire Rate 2-or-lower (except heavy) weapon: +1 CD per rank. Rank 2: also +Piercing 1.',
		flavor: 'Hunting rifle / sniper rifle / combat rifle classic. The bolt-action build mainline.'
	},
	{
		key: 'roboticsExpert',
		name: 'Robotics Expert',
		ranks: 3,
		category: 'crafting',
		requirements: { special: { intelligence: 8 }, level: 2 },
		rankIncrease: 4,
		text: 'Modify robot armor/weapons/modules. Reduce difficulty of robot repair tests. Rank 3: reprogram robots to fulfill different functions.',
		flavor: 'Mister Handy player\'s self-care perk, also lets you turn enemy turrets into friends.'
	},
	{
		key: 'science',
		name: 'Science!',
		ranks: 4,
		category: 'crafting',
		requirements: { special: { intelligence: 6 }, level: 2 },
		rankIncrease: 4,
		text: 'Modify energy weapons with weapon mods. Craft advanced armor mods. Each rank unlocks an additional rank of mods.',
		flavor: 'Energy-weapon equivalent of Gun Nut. Plus required for the best Power Armor system mods.'
	},
	{
		key: 'scoundrel',
		name: 'Scoundrel',
		ranks: 1,
		category: 'social',
		requirements: { special: { charisma: 7 } },
		text: 'When you make a CHA+Speech test to convince someone of a lie, you may ignore the first complication you roll.',
		flavor: 'Smooth talker / con artist pick. Lets you lie repeatedly without snowballing trouble.'
	},
	{
		key: 'shotgunSurgeon',
		name: 'Shotgun Surgeon',
		ranks: 1,
		category: 'combat',
		requirements: { special: { strength: 5, agility: 7 } },
		text: 'Your ranged attacks with shotguns gain Piercing 1 (or +1 to existing Piercing X).',
		flavor: 'Combat shotgun / double-barrel build. Lets your spread effect punch through armor.'
	},
	{
		key: 'sizeMatters',
		name: 'Size Matters',
		ranks: 3,
		category: 'combat',
		requirements: { special: { endurance: 7, agility: 6 } },
		rankIncrease: 4,
		text: 'When you make a ranged attack with any heavy weapon (minigun, missile launcher, Fat Man, gatling laser), +1 CD per rank to damage.',
		flavor: 'Heavy weapons specialist. Stack with Sniper-perks, Power Armor, and Big Guns Tag.'
	},
	{
		key: 'slayer',
		name: 'Slayer',
		ranks: 1,
		category: 'crit',
		requirements: { special: { strength: 8 } },
		text: 'When you inflict any damage with an unarmed or melee weapon, spend 1 Luck Point to immediately inflict a critical hit + injury at the location hit. The mechanical equivalent of D&D Smite.',
		flavor: 'Melee Smite. STR 8 + a few Luck Points = burst damage on demand. Best perk for paladin-style melee.'
	},
	{
		key: 'smoothTalker',
		name: 'Smooth Talker',
		ranks: 1,
		category: 'social',
		requirements: { special: { charisma: 6 } },
		text: 'When you make a Barter or Speech test as part of an opposed test (against another person), re-roll 1d20.',
		flavor: 'Cheap CHA pick that quietly improves every social roll vs an NPC.'
	},
	{
		key: 'sniper',
		name: 'Sniper',
		ranks: 1,
		category: 'combat',
		requirements: { special: { perception: 8, agility: 6 } },
		text: 'When you take Aim and then make a ranged attack with a two-handed Accurate weapon (hunting rifle, sniper rifle, Gauss rifle), you can specify a hit location WITHOUT the usual +1 difficulty.',
		flavor: 'Headshot perk. Pair with Awareness or Steady Aim for free Piercing or re-rolls on top.'
	},
	{
		key: 'solarPowered',
		name: 'Solar Powered',
		ranks: 1,
		category: 'survival',
		requirements: { special: { endurance: 7 } },
		text: 'For every hour you spend in direct sunlight, heal 1 radiation damage.',
		flavor: 'Niche but free. Outdoor explorers and ghouls who DON\'T want to stay glowing.'
	},
	{
		key: 'steadyAim',
		name: 'Steady Aim',
		ranks: 1,
		category: 'tactical',
		requirements: { special: { strength: 8, agility: 7 } },
		text: 'When you take Aim, either re-roll 2d20 on the first attack this turn, OR re-roll 1d20 on all attacks this turn.',
		flavor: 'Big-gun stabilizer. Massively boosts hit chances if you aim before firing.'
	},
	{
		key: 'strongBack',
		name: 'Strong Back',
		ranks: 3,
		category: 'utility',
		requirements: { special: { strength: 5 }, level: 1 },
		rankIncrease: 2,
		text: 'Maximum carry weight is increased by +25 lbs per rank.',
		flavor: 'Pack mule perk. Niche but essential for traders or scavenger-heavy parties.'
	},
	{
		key: 'tag',
		name: 'Tag!',
		ranks: 1,
		category: 'utility',
		requirements: { level: 5 },
		text: 'Select one additional Tag skill. Increase its rank by 2 (max 6) and mark it as a Tag skill (each die <= rank also crits).',
		flavor: 'Best mid-game pivot perk. Locked behind level 5 but adds an entire Tag skill.'
	},
	{
		key: 'terrifyingPresence',
		name: 'Terrifying Presence',
		ranks: 2,
		category: 'social',
		requirements: { special: { strength: 6, charisma: 8 }, level: 3 },
		rankIncrease: 5,
		text: 'When you make a Speech test to threaten/scare someone, re-roll 1d20. Rank 2: a major action to STR+Speech (DC 2) forces the enemy to move away on their next turn.',
		flavor: 'Big intimidator. STR 6 + CHA 8 makes you a wall of menace; rank 2 turns Speech into crowd control.'
	},
	{
		key: 'toughness',
		name: 'Toughness',
		ranks: 2,
		category: 'defense',
		requirements: { special: { endurance: 6, luck: 6 }, level: 1 },
		rankIncrease: 4,
		text: 'Physical Damage Resistance to all hit locations increases by +1 per rank.',
		flavor: 'The classic "more armor everywhere" pick. Stacks with worn armor on every location.'
	}
];

export const PERKS_BY_KEY: Record<string, PerkDef> = Object.fromEntries(
	PERKS.map((p) => [p.key, p])
);
