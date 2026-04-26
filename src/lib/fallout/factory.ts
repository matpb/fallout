import { v4 as uuid } from 'uuid';
import type { Character, OriginKey, SkillKey, Skills } from './types';
import { SKILL_KEYS } from './types';
import { ORIGIN_BY_KEY } from './origins';
import { applyOriginBonus, maxHp, maxLuck } from './derived';

export function emptySkills(): Skills {
	return Object.fromEntries(SKILL_KEYS.map((k) => [k, 0])) as Skills;
}

export function createBlankCharacter(originKey: OriginKey = 'survivor'): Character {
	const now = Date.now();
	const baseSpecial = { strength: 5, perception: 5, endurance: 5, charisma: 5, intelligence: 5, agility: 5, luck: 5 };
	const c: Character = {
		id: uuid(),
		schemaVersion: 1,
		createdAt: now,
		updatedAt: now,
		name: 'New Wanderer',
		originKey,
		level: 1,
		xp: 0,
		special: baseSpecial,
		tagSkills: [],
		skills: emptySkills(),
		perks: [],
		traits: [],
		caps: 0,
		inventory: [],
		trinket: '',
		currentHp: 0,
		currentLuck: 0,
		notes: '',
		powerArmorActive: false
	};
	// origin-tag-skill auto-add for ghoul (Survival +2 Tag)
	if (originKey === 'ghoul') {
		c.tagSkills = ['survival'];
		c.skills.survival = 2;
	}
	// Compute starting HP/Luck from base
	const withBonus = { ...c, special: applyOriginBonus(c) };
	c.currentHp = maxHp(withBonus);
	c.currentLuck = maxLuck(withBonus);
	return c;
}

export function applyOriginToBase(c: Character): Character {
	// Apply origin SPECIAL bonuses to base values when origin is chosen.
	// Used during creation step transitions.
	const origin = ORIGIN_BY_KEY[c.originKey];
	if (!origin.specialBonuses) return c;
	const next = { ...c, special: { ...c.special } };
	for (const [k, v] of Object.entries(origin.specialBonuses)) {
		next.special[k as keyof Character['special']] += v as number;
	}
	return next;
}

export function isTagSkill(c: Character, key: SkillKey): boolean {
	return c.tagSkills.includes(key);
}
