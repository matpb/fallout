import type { Character, SpecialKey } from './types';
import { ORIGIN_BY_KEY } from './origins';

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
	return c.inventory.reduce((s, i) => s + (i.weight ?? 0) * (i.qty ?? 1), 0);
}
