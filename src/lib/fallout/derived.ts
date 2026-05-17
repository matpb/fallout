import type { BodyLocation, Character, DamageType, SpecialKey } from './types';
import { BODY_LOCATIONS } from './types';
import { ORIGIN_BY_KEY, findPlatingDef } from './origins';

export interface DerivedStats {
	carryWeight: number;
	defense: number;
	initiative: number;
	maxHp: number;
	meleeBonusCD: number;
	maxLuck: number;
	skillsTNs: Record<string, number>;
}

export function applyOriginBonus(c: Character): Character['special'] {
	const origin = ORIGIN_BY_KEY[c.originKey];
	if (!origin.specialBonuses) return c.special;
	const out = { ...c.special };
	for (const [k, v] of Object.entries(origin.specialBonuses)) {
		const key = k as SpecialKey;
		out[key] = (out[key] ?? 0) + (v as number);
	}
	return out;
}

export function specialMaxFor(c: Character, key: SpecialKey): number {
	const origin = ORIGIN_BY_KEY[c.originKey];
	const overrideKey = key as string;
	if (origin.maxSpecialOverrides && overrideKey in origin.maxSpecialOverrides) {
		return origin.maxSpecialOverrides[overrideKey] as number;
	}
	return 10;
}

export function carryWeight(c: Character): number {
	if (c.originKey === 'misterHandy') return 150;
	const small = c.traits.includes('smallFrame');
	const factor = small ? 5 : 10;
	const base = 150 + c.special.strength * factor;
	const strongBack = c.perks.find((p) => p.key === 'strongBack');
	return base + (strongBack ? strongBack.rank * 25 : 0);
}

export function defense(c: Character): number {
	return c.special.agility >= 9 ? 2 : 1;
}

export function initiative(c: Character): number {
	return c.special.perception + c.special.agility;
}

export function meleeBonusCD(c: Character): number {
	const base = c.special.strength >= 11 ? 3 : c.special.strength >= 9 ? 2 : c.special.strength >= 7 ? 1 : 0;
	const heavyHanded = c.traits.includes('heavyHanded') ? 1 : 0;
	return base + heavyHanded;
}

export function maxHp(c: Character): number {
	const base = c.special.endurance + c.special.luck;
	const lifeGiver = c.perks.find((p) => p.key === 'lifeGiver');
	const fromPerk = lifeGiver ? lifeGiver.rank * 3 : 0;
	const fromLevel = Math.max(0, c.level - 1); // +1 HP per level after 1
	return base + fromPerk + fromLevel;
}

export function maxLuck(c: Character): number {
	const lck = c.special.luck;
	const giftedPenalty = c.traits.includes('gifted') ? 1 : 0;
	return Math.max(0, lck - giftedPenalty);
}

import { SKILL_DEFAULT_ATTR, SKILL_KEYS } from './types';

export function skillTNs(c: Character): Record<string, number> {
	const tns: Record<string, number> = {};
	for (const key of SKILL_KEYS) {
		const attr = SKILL_DEFAULT_ATTR[key];
		tns[key] = c.special[attr] + (c.skills[key] ?? 0);
	}
	return tns;
}

export function deriveAll(c: Character): DerivedStats {
	return {
		carryWeight: carryWeight(c),
		defense: defense(c),
		initiative: initiative(c),
		maxHp: maxHp(c),
		meleeBonusCD: meleeBonusCD(c),
		maxLuck: maxLuck(c),
		skillsTNs: skillTNs(c)
	};
}

export function inventoryWeight(c: Character): number {
	const inv = c.inventory.reduce((s, i) => s + (i.weight ?? 0) * (i.qty ?? 1), 0);
	const weapons = (c.weapons ?? []).reduce(
		(s, w) => s + (w.weight ?? 0) * (w.qty ?? 1),
		0
	);
	const armor = (c.armor ?? []).reduce((s, a) => s + (a.weight ?? 0), 0);
	return inv + weapons + armor;
}

// Total damage resistance per location, summed across equipped armor pieces.
// Useful to render the armor matrix and warn about uncovered locations.
export type ArmorMatrix = Record<BodyLocation, Record<DamageType, number>>;

export function armorMatrix(c: Character): ArmorMatrix {
	const out: ArmorMatrix = {} as ArmorMatrix;
	for (const loc of BODY_LOCATIONS) {
		out[loc] = { physical: 0, energy: 0, radiation: 0, poison: 0 };
	}
	for (const piece of c.armor ?? []) {
		if (!piece.equipped) continue;
		const row = out[piece.location];
		if (!row) continue;
		row.physical += piece.dr.physical || 0;
		row.energy += piece.dr.energy || 0;
		row.radiation += piece.dr.radiation || 0;
		row.poison += piece.dr.poison || 0;
	}
	// Mr Handy plating covers the whole body — add its PHY/ENR DR to every location.
	if (c.originKey === 'misterHandy') {
		const plating = findPlatingDef(c.misterHandyPlating);
		if (plating) {
			for (const loc of BODY_LOCATIONS) {
				out[loc].physical += plating.dr.physical;
				out[loc].energy += plating.dr.energy;
			}
		}
	}
	return out;
}

// Aggregate DR across all locations — the "averaged" view for derived stats.
// Returns the average DR across the 6 hit locations per damage type, rounded
// down. Useful as an at-a-glance summary; the per-location matrix in the
// Armor section is still the source of truth at the table.
export function aggregateDR(c: Character): Record<DamageType, number> {
	const matrix = armorMatrix(c);
	const totals: Record<DamageType, number> = { physical: 0, energy: 0, radiation: 0, poison: 0 };
	for (const loc of BODY_LOCATIONS) {
		const row = matrix[loc];
		totals.physical += row.physical;
		totals.energy += row.energy;
		totals.radiation += row.radiation;
		totals.poison += row.poison;
	}
	const n = BODY_LOCATIONS.length;
	return {
		physical: Math.floor(totals.physical / n),
		energy: Math.floor(totals.energy / n),
		radiation: Math.floor(totals.radiation / n),
		poison: Math.floor(totals.poison / n)
	};
}
