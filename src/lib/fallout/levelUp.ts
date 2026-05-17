// Level-up rules from Core Rulebook p.74-75.
//
// On level-up, each character gains:
//   - +1 maximum HP (auto, applied by the maxHp formula in derived.ts)
//   - +1 skill rank in a skill of choice (max rank 6, or 4 for Super Mutant)
//   - 1 new perk (or rank up an existing multi-rank perk), prerequisites apply
//
// SPECIAL attributes do NOT increase on level-up — only via certain perks.

// XP thresholds for levels 1 through 21 from the Level and Experience table (p.74).
// Index = level (so [1] is XP needed for level 1, etc.). Index 0 is unused.
const XP_TABLE: number[] = [
	0, // unused
	0, // L1
	100, // L2
	300, // L3
	600, // L4
	1000, // L5
	1500, // L6
	2100, // L7
	2800, // L8
	3600, // L9
	4500, // L10
	5500, // L11
	6600, // L12
	7800, // L13
	9100, // L14
	10500, // L15
	12000, // L16
	13600, // L17
	15300, // L18
	17100, // L19
	19000, // L20
	21000 // L21
];

// Beyond L21: XP required to reach level L = (L * (L-1) / 2) * 100.
// This matches the printed table values, so we use it as a continuation.
export function xpForLevel(level: number): number {
	if (level <= 1) return 0;
	if (level <= 21) return XP_TABLE[level];
	return Math.floor((level * (level - 1)) / 2) * 100;
}

export function xpToNextLevel(currentLevel: number, currentXp: number): number {
	return Math.max(0, xpForLevel(currentLevel + 1) - currentXp);
}

export function canLevelUp(currentLevel: number, currentXp: number): boolean {
	return currentXp >= xpForLevel(currentLevel + 1);
}

// Returns 0..1 progress fraction toward the next level.
export function levelProgress(currentLevel: number, currentXp: number): number {
	const cur = xpForLevel(currentLevel);
	const next = xpForLevel(currentLevel + 1);
	if (next <= cur) return 0;
	return Math.max(0, Math.min(1, (currentXp - cur) / (next - cur)));
}
