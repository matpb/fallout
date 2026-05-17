<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { characters } from '$lib/store.svelte';
	import {
		MISTER_HANDY_VARIANTS,
		MISTER_HANDY_VARIANT_BY_KEY,
		ORIGIN_BY_KEY,
		ROBOT_MODS,
		ROBOT_MOD_BY_KEY,
		ROBOT_PLATING_CATALOG,
		ROBOT_PLATING_PRESETS,
		findPlatingDef
	} from '$lib/fallout/origins';
	import {
		CATEGORY_LABELS,
		PERKS,
		PERKS_BY_KEY,
		type PerkCategory,
		type PerkDef
	} from '$lib/fallout/perks';
	import { applyOriginToBase, isSkillBlockedByOrigin, isTagSkill } from '$lib/fallout/factory';
	import {
		aggregateDR,
		armorMatrix,
		deriveAll,
		inventoryWeight,
		specialMaxFor
	} from '$lib/fallout/derived';
	import { canLevelUp, xpForLevel, xpToNextLevel } from '$lib/fallout/levelUp';
	import {
		ARM_ATTACHMENT_META,
		BODY_LOCATIONS,
		BODY_LOCATION_LABELS,
		SKILL_KEYS,
		SKILL_LABELS,
		SKILL_DEFAULT_ATTR,
		SPECIAL_KEYS,
		SPECIAL_LABELS,
		type ArmAttachment,
		type ArmorPiece,
		type BodyLocation,
		type Character,
		type DamageType,
		type MisterHandyVariant,
		type SkillKey,
		type WeaponItem
	} from '$lib/fallout/types';
	import { v4 as uuid } from 'uuid';

	let character = $state<Character | null>(null);
	let editingName = $state(false);

	// Auto-save plumbing. Once a character is loaded for `loadedId`, the local
	// `character` state becomes authoritative — subsequent store refreshes won't
	// clobber in-progress edits. `lastSavedFingerprint` tracks what's persisted
	// so we only write when something actually changed.
	let loadedId = $state<string | null>(null);
	let lastSavedFingerprint = $state<string | null>(null);
	let saveStatus = $state<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
	let saveError = $state<string | null>(null);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedFadeTimer: ReturnType<typeof setTimeout> | null = null;
	const AUTOSAVE_DEBOUNCE_MS = 400;

	// Level-up wizard state
	let levelUpOpen = $state(false);
	let levelUpSkill = $state<SkillKey | ''>('');
	let levelUpPerkKey = $state<string>('');

	// Add-perk modal state (for editing the Perks panel outside of level-up)
	let addPerkOpen = $state(false);
	let addPerkFilter = $state<'all' | PerkCategory>('all');
	let addPerkShowUnavailable = $state(true);

	$effect(() => {
		const id = page.params.id;
		if (!id) return;
		void characters.state.items;
		if (loadedId === id) return; // already loaded — local state is authoritative
		const c = characters.get(id);
		if (!c) return;
		character = JSON.parse(JSON.stringify(c));
		loadedId = id;
		lastSavedFingerprint = JSON.stringify(character);
		saveStatus = 'idle';
	});

	onMount(async () => {
		const id = page.params.id;
		if (!id) return;
		await characters.refresh();
		if (loadedId === id) return;
		const c = characters.get(id);
		if (!c) return;
		character = JSON.parse(JSON.stringify(c));
		loadedId = id;
		lastSavedFingerprint = JSON.stringify(character);
		saveStatus = 'idle';
	});

	// Auto-save effect: any time character changes, debounce a write.
	$effect(() => {
		if (!character) return;
		const fp = JSON.stringify(character);
		if (lastSavedFingerprint === null || fp === lastSavedFingerprint) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveStatus = 'pending';
		saveTimer = setTimeout(() => void flushSave(), AUTOSAVE_DEBOUNCE_MS);
	});

	async function flushSave() {
		if (!character) return;
		const snapshot = JSON.stringify(character);
		if (snapshot === lastSavedFingerprint) {
			saveStatus = 'idle';
			return;
		}
		saveStatus = 'saving';
		saveError = null;
		try {
			await characters.upsertSilent(character);
			lastSavedFingerprint = snapshot;
			saveStatus = 'saved';
			if (savedFadeTimer) clearTimeout(savedFadeTimer);
			savedFadeTimer = setTimeout(() => {
				if (saveStatus === 'saved') saveStatus = 'idle';
			}, 1800);
		} catch (err) {
			console.error('autosave failed', err);
			saveError = err instanceof Error ? err.message : String(err);
			saveStatus = 'error';
		}
	}

	// Manual save button — useful as a "force flush" + reassurance gesture.
	async function save() {
		if (saveTimer) clearTimeout(saveTimer);
		await flushSave();
	}

	let origin = $derived(character ? ORIGIN_BY_KEY[character.originKey] : null);
	let derived_ = $derived(character ? deriveAll(applyOriginToBase(character)) : null);
	let invWeight = $derived(character ? inventoryWeight(character) : 0);
	let invOver = $derived(derived_ && invWeight > derived_.carryWeight);
	let armorByLocation = $derived(character ? armorMatrix(character) : null);
	let aggregateDr = $derived(character ? aggregateDR(character) : null);
	let favoriteWeapon = $derived.by(() => {
		const c = character;
		if (!c || !c.favoriteWeaponId) return null;
		return c.weapons.find((w) => w.id === c.favoriteWeaponId) ?? null;
	});
	let favoriteWeaponTn = $derived.by(() => {
		if (!character || !favoriteWeapon) return null;
		const final = applyOriginToBase(character).special;
		const attr = SKILL_DEFAULT_ATTR[favoriteWeapon.skill];
		return final[attr] + character.skills[favoriteWeapon.skill];
	});
	let handyVariantDef = $derived(
		character?.misterHandyVariant
			? MISTER_HANDY_VARIANT_BY_KEY[character.misterHandyVariant]
			: null
	);
	let hasPincer = $derived(character?.misterHandyAttachments?.includes('pincer') ?? false);

	// XP / level helpers
	let nextLevel = $derived(character ? character.level + 1 : 2);
	let xpNeededNext = $derived(character ? xpForLevel(nextLevel) : 0);
	let xpToNext = $derived(
		character ? xpToNextLevel(character.level, character.xp) : 0
	);
	let canLvl = $derived(character ? canLevelUp(character.level, character.xp) : false);
	let postLevelSkillCap = $derived(character?.originKey === 'superMutant' ? 4 : 6);

	// Perks available on level-up (gating on requirements at the would-be level)
	function perkUnmet(p: PerkDef, asLevel: number): string | null {
		if (!character) return 'no character';
		if (p.requirements.notRobot && character.originKey === 'misterHandy') return 'Not available to robots';
		if (p.requirements.level && asLevel < p.requirements.level) {
			return `Needs Level ${p.requirements.level}`;
		}
		if (p.requirements.special) {
			const final = applyOriginToBase(character).special;
			const missing: string[] = [];
			for (const [k, min] of Object.entries(p.requirements.special)) {
				const cur = final[k as keyof typeof final];
				if (cur < (min as number)) {
					missing.push(`${SPECIAL_LABELS[k as keyof typeof final].short} ${cur}/${min}`);
				}
			}
			if (missing.length) return `Needs ${missing.join(', ')}`;
		}
		// Existing perk: can only rank-up if rank < ranks
		const existing = character.perks.find((pp) => pp.key === p.key);
		if (existing && existing.rank >= p.ranks) return 'Maxed';
		return null;
	}

	let levelUpPerksAvailable = $derived(
		character
			? PERKS.filter((p) => perkUnmet(p, nextLevel) === null).sort((a, b) =>
					a.name.localeCompare(b.name)
				)
			: []
	);

	async function remove() {
		if (!character) return;
		if (!confirm(`Delete "${character.name}" forever? This cannot be undone.`)) return;
		await characters.remove(character.id);
		await goto('/');
	}

	function addInventoryItem() {
		if (!character) return;
		character.inventory = [
			...character.inventory,
			{ id: uuid(), name: '', qty: 1, weight: 0, notes: '' }
		];
	}

	function removeInventoryItem(id: string) {
		if (!character) return;
		character.inventory = character.inventory.filter((i) => i.id !== id);
	}

	function addWeapon() {
		if (!character) return;
		const newWeapon: WeaponItem = {
			id: uuid(),
			name: '',
			skill: 'smallGuns',
			damageCD: 1,
			damageType: 'physical',
			damageEffects: '',
			range: 'M',
			fireRate: 0,
			ammo: '',
			ammoQty: 0,
			qty: 1,
			weight: 0,
			mods: '',
			notes: ''
		};
		character.weapons = [...character.weapons, newWeapon];
	}

	function removeWeapon(id: string) {
		if (!character) return;
		character.weapons = character.weapons.filter((w) => w.id !== id);
		if (character.favoriteWeaponId === id) character.favoriteWeaponId = undefined;
	}

	function toggleFavoriteWeapon(id: string) {
		if (!character) return;
		character.favoriteWeaponId = character.favoriteWeaponId === id ? undefined : id;
	}

	function addArmor() {
		if (!character) return;
		const piece: ArmorPiece = {
			id: uuid(),
			name: '',
			coverage: [
				{ location: 'torso', dr: { physical: 0, energy: 0, radiation: 0, poison: 0 } }
			],
			weight: 0,
			equipped: true,
			notes: ''
		};
		character.armor = [...character.armor, piece];
	}

	function removeArmor(id: string) {
		if (!character) return;
		character.armor = character.armor.filter((a) => a.id !== id);
	}

	function addArmorCoverage(armorId: string) {
		if (!character) return;
		const piece = character.armor.find((a) => a.id === armorId);
		if (!piece) return;
		piece.coverage = [
			...piece.coverage,
			{ location: 'torso', dr: { physical: 0, energy: 0, radiation: 0, poison: 0 } }
		];
		character.armor = [...character.armor];
	}

	function removeArmorCoverage(armorId: string, idx: number) {
		if (!character) return;
		const piece = character.armor.find((a) => a.id === armorId);
		if (!piece) return;
		piece.coverage = piece.coverage.filter((_, i) => i !== idx);
		character.armor = [...character.armor];
	}

	function setHandyVariant(v: MisterHandyVariant) {
		if (!character) return;
		const def = MISTER_HANDY_VARIANT_BY_KEY[v];
		character.misterHandyVariant = v;
		character.misterHandyAttachments = [...def.attachments];
		character.misterHandyPlating = def.plating;
	}

	function setHandyArm(idx: number, att: ArmAttachment) {
		if (!character) return;
		const current = character.misterHandyAttachments ?? ['pincer', 'flamer', 'laserEmitter'];
		const next: ArmAttachment[] = [...current];
		next[idx] = att;
		character.misterHandyAttachments = next;
	}

	function addRobotMod(key: string) {
		if (!character) return;
		const mods = character.robotMods ?? [];
		if (key === '__custom') {
			character.robotMods = [
				...mods,
				{ id: uuid(), key: '__custom', name: '', effect: '', notes: '' }
			];
			return;
		}
		const def = ROBOT_MOD_BY_KEY[key];
		if (!def) return;
		character.robotMods = [
			...mods,
			{ id: uuid(), key: def.key, name: def.name, effect: def.effect, notes: '' }
		];
	}

	function removeRobotMod(id: string) {
		if (!character) return;
		character.robotMods = (character.robotMods ?? []).filter((m) => m.id !== id);
	}

	// Perk editing (sheet-level, outside the level-up wizard).
	// Players sometimes need to correct a creation mistake, re-spec at the GM's
	// discretion, or fold in homebrew. We let them add/remove/re-rank freely and
	// only warn when requirements aren't currently met.
	function addPerk(key: string) {
		if (!character) return;
		const def = PERKS_BY_KEY[key];
		if (!def) return;
		const existing = character.perks.find((p) => p.key === key);
		if (existing) {
			// Already taken — rank up if under cap, else no-op
			if (existing.rank < def.ranks) {
				existing.rank += 1;
				character.perks = [...character.perks];
			}
		} else {
			character.perks = [...character.perks, { key, rank: 1 }];
		}
	}

	function removePerk(key: string) {
		if (!character) return;
		character.perks = character.perks.filter((p) => p.key !== key);
	}

	function bumpPerkRank(key: string, dir: 1 | -1) {
		if (!character) return;
		const def = PERKS_BY_KEY[key];
		const idx = character.perks.findIndex((p) => p.key === key);
		if (idx < 0) return;
		const cur = character.perks[idx];
		const next = cur.rank + dir;
		if (next < 1) {
			// Going below 1 removes the perk entirely
			removePerk(key);
			return;
		}
		if (def && next > def.ranks) return;
		cur.rank = next;
		character.perks = [...character.perks];
	}

	// Reuse the level-up requirement check, but use the *current* level so the
	// add-perk modal mirrors the rulebook semantics for a perk taken right now.
	function perkUnmetForAdd(p: PerkDef): string | null {
		if (!character) return 'no character';
		return perkUnmet(p, character.level);
	}

	const PERK_CATEGORIES_LIST: PerkCategory[] = [
		'combat',
		'defense',
		'tactical',
		'crit',
		'stealth',
		'crafting',
		'social',
		'utility',
		'survival'
	];

	let addPerkVisible = $derived(
		character
			? PERKS.filter((p) => {
					if (addPerkFilter !== 'all' && p.category !== addPerkFilter) return false;
					if (!addPerkShowUnavailable && perkUnmetForAdd(p) !== null) return false;
					return true;
				}).sort((a, b) => {
					const aOk = perkUnmetForAdd(a) === null ? 0 : 1;
					const bOk = perkUnmetForAdd(b) === null ? 0 : 1;
					if (aOk !== bOk) return aOk - bOk;
					return a.name.localeCompare(b.name);
				})
			: []
	);

	function clamp(n: number, lo: number, hi: number): number {
		return Math.max(lo, Math.min(hi, n));
	}

	function openLevelUp() {
		levelUpSkill = '';
		levelUpPerkKey = '';
		levelUpOpen = true;
	}

	async function applyLevelUp() {
		if (!character || !levelUpSkill || !levelUpPerkKey) return;
		// +1 skill rank (clamped to cap)
		const cap = postLevelSkillCap;
		character.skills[levelUpSkill] = Math.min(cap, character.skills[levelUpSkill] + 1);
		// Perk: rank up if existing else add at rank 1
		const existingIdx = character.perks.findIndex((p) => p.key === levelUpPerkKey);
		if (existingIdx >= 0) {
			character.perks[existingIdx].rank += 1;
			character.perks = [...character.perks];
		} else {
			character.perks = [...character.perks, { key: levelUpPerkKey, rank: 1 }];
		}
		// Level up
		character.level += 1;
		// Heal to new max HP on level-up (rulebook doesn't mandate but it's the convention)
		const d = deriveAll(applyOriginToBase(character));
		character.currentHp = d.maxHp;
		await save();
		levelUpOpen = false;
	}

	// Super mutant armor warning: only Raider armor fits.
	function isUnfitArmorForSuperMutant(piece: ArmorPiece): boolean {
		if (!character || character.originKey !== 'superMutant') return false;
		return !/\braider\b/i.test(piece.name);
	}

	const DAMAGE_TYPES: DamageType[] = ['physical', 'energy', 'radiation', 'poison'];
	const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
		physical: 'PHYS',
		energy: 'ENRG',
		radiation: 'RAD',
		poison: 'PSN'
	};
</script>

<svelte:head>
	<title>Pip-Boy 3000 — {character?.name ?? '...'}</title>
</svelte:head>

{#if !character || !origin || !derived_}
	<p class="opacity-70">[ LOADING… ]</p>
{:else}
	<div class="space-y-4">
		<!-- Header card -->
		<section class="pip-panel">
			<div class="pip-panel-header flex items-center justify-between gap-2">
				<span>STAT &gt; {character.name}</span>
				<span class="flex items-center gap-3 text-xs opacity-80">
					<span data-testid="save-status">
						{#if saveStatus === 'saving'}saving…
						{:else if saveStatus === 'pending'}⏳ pending
						{:else if saveStatus === 'saved'}✓ saved
						{:else if saveStatus === 'error'}⚠ save failed
						{:else}✓ auto-saved
						{/if}
					</span>
					<span>LVL {character.level} · XP {character.xp}</span>
				</span>
			</div>
			<div class="space-y-3 p-4 sm:p-6">
				<div class="flex flex-wrap items-center justify-between gap-2">
					{#if editingName}
						<input
							class="pip-input max-w-xs"
							data-testid="name-input"
							bind:value={character.name}
							onblur={() => (editingName = false)}
							onkeydown={(e) => e.key === 'Enter' && (editingName = false)}
						/>
					{:else}
						<button
							type="button"
							class="pip-display pip-glow text-3xl"
							data-testid="name-display"
							onclick={() => (editingName = true)}>{character.name}</button
						>
					{/if}
					<div class="text-sm">
						<span class="opacity-70">Origin:</span> {origin.name}{#if character.originKey === 'misterHandy' && handyVariantDef}
							<span class="opacity-60"> · {handyVariantDef.name}</span>
						{/if}
					</div>
				</div>

				{#if character.originKey === 'superMutant'}
					<div class="pip-glow-amber border border-[var(--color-pip-amber)] p-2 text-xs">
						⚠ SUPER MUTANT — only Raider armor fits this frame (Core Rulebook p.83). Other armor
						pieces below will show a warning.
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 no-print">
					<label class="text-xs">
						<span class="opacity-70">LEVEL</span>
						<input
							class="pip-input"
							data-testid="level-input"
							type="number"
							min="1"
							max="100"
							value={character.level}
							onchange={(e) =>
								(character!.level = clamp(parseInt((e.target as HTMLInputElement).value) || 1, 1, 100))}
						/>
					</label>
					<label class="text-xs">
						<span class="opacity-70">XP {xpToNext > 0 ? `(${xpToNext} → L${nextLevel})` : '(maxed for table)'}</span>
						<input class="pip-input" data-testid="xp-input" type="number" min="0" bind:value={character.xp} />
					</label>
					<label class="text-xs">
						<span class="opacity-70">HP / {derived_.maxHp}</span>
						<input
							class="pip-input"
							data-testid="hp-input"
							type="number"
							min="0"
							max={derived_.maxHp}
							value={character.currentHp}
							onchange={(e) =>
								(character!.currentHp = clamp(
									parseInt((e.target as HTMLInputElement).value) || 0,
									0,
									derived_!.maxHp
								))}
						/>
					</label>
					<label class="text-xs">
						<span class="opacity-70">LUCK / {derived_.maxLuck}</span>
						<input
							class="pip-input"
							data-testid="luck-input"
							type="number"
							min="0"
							max={derived_.maxLuck}
							value={character.currentLuck}
							onchange={(e) =>
								(character!.currentLuck = clamp(
									parseInt((e.target as HTMLInputElement).value) || 0,
									0,
									derived_!.maxLuck
								))}
						/>
					</label>
				</div>

				<div class="flex items-center gap-2 no-print">
					<button
						class="pip-btn"
						class:pip-glow-amber={canLvl}
						data-testid="levelup-btn"
						disabled={!canLvl}
						onclick={openLevelUp}
					>
						[ ↑ ] LEVEL UP
					</button>
					{#if !canLvl}
						<span class="text-xs opacity-70">need {xpToNext} more XP for L{nextLevel}</span>
					{:else}
						<span class="pip-glow-amber text-xs">ready for L{nextLevel}</span>
					{/if}
				</div>
			</div>
		</section>

		<!-- SPECIAL -->
		<section class="pip-panel">
			<div class="pip-panel-header flex items-center justify-between">
				<span>S.P.E.C.I.A.L.</span>
				<span class="text-[0.65rem] opacity-80 normal-case tracking-normal">
					base values · origin bonus shown below if any
				</span>
			</div>
			<div class="grid grid-cols-7 gap-2 p-4 text-center sm:p-6">
				{#each SPECIAL_KEYS as k (k)}
					{@const baseVal = character.special[k]}
					{@const finalVal = applyOriginToBase(character).special[k]}
					{@const bonus = finalVal - baseVal}
					{@const cap = specialMaxFor(character, k)}
					{@const startVal = character.createdSpecial?.[k]}
					{@const drift = startVal !== undefined ? finalVal - startVal : 0}
					<div>
						<div class="text-xs opacity-70">{SPECIAL_LABELS[k].short}</div>
						<input
							class="pip-input pip-display !text-3xl !text-center px-1"
							data-testid={`special-${k}-input`}
							type="number"
							min="1"
							max={cap}
							value={baseVal}
							onchange={(e) =>
								(character!.special[k] = clamp(
									parseInt((e.target as HTMLInputElement).value) || 0,
									1,
									cap
								))}
						/>
						{#if bonus !== 0}
							<div class="pip-glow-amber text-[0.6rem]">
								{bonus > 0 ? '+' : ''}{bonus} ⇒ {finalVal}
							</div>
						{:else}
							<div class="text-[0.6rem] opacity-50">max {cap}</div>
						{/if}
						{#if startVal !== undefined && drift !== 0}
							<div class="text-[0.6rem] opacity-60" title="Value at character creation">
								started {startVal}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<!-- Derived -->
		<section class="pip-panel">
			<div class="pip-panel-header">DERIVED STATISTICS</div>
			<div class="space-y-3 p-4 sm:p-6">
				<div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
					<div>
						<div class="text-xs opacity-70">DEFENSE</div>
						<div class="pip-display pip-glow text-2xl">{derived_.defense}</div>
					</div>
					<div>
						<div class="text-xs opacity-70">INITIATIVE</div>
						<div class="pip-display pip-glow text-2xl">{derived_.initiative}</div>
					</div>
					<div>
						<div class="text-xs opacity-70">MELEE BONUS</div>
						<div class="pip-display pip-glow text-2xl">+{derived_.meleeBonusCD} CD</div>
					</div>
					<div>
						<div class="text-xs opacity-70">CARRY</div>
						<div class="pip-display text-2xl {invOver ? 'pip-glow-amber' : 'pip-glow'}">
							{invWeight} / {derived_.carryWeight} lbs
						</div>
					</div>
					<div>
						<div class="text-xs opacity-70">CAPS</div>
						<input
							class="pip-input pip-display pip-glow text-xl"
							data-testid="caps-input"
							type="number"
							min="0"
							bind:value={character.caps}
						/>
					</div>
				</div>

				<!-- Avg DR summary (with plating) -->
				{#if aggregateDr}
					<div class="border-t border-[var(--color-pip-green-dim)] pt-3">
						<div class="text-xs opacity-70">
							AVG DR (across 6 locations, equipped armor + plating)
						</div>
						<div class="mt-1 grid grid-cols-4 gap-2 text-center text-sm" data-testid="dr-summary">
							<div>
								<div class="text-xs opacity-70">PHYS</div>
								<div class="pip-display {aggregateDr.physical > 0 ? 'pip-glow' : 'opacity-40'} text-2xl">
									{aggregateDr.physical}
								</div>
							</div>
							<div>
								<div class="text-xs opacity-70">ENRG</div>
								<div class="pip-display {aggregateDr.energy > 0 ? 'pip-glow' : 'opacity-40'} text-2xl">
									{aggregateDr.energy}
								</div>
							</div>
							<div>
								<div class="text-xs opacity-70">RAD</div>
								<div class="pip-display {aggregateDr.radiation > 0 ? 'pip-glow' : 'opacity-40'} text-2xl">
									{aggregateDr.radiation}
								</div>
							</div>
							<div>
								<div class="text-xs opacity-70">PSN</div>
								<div class="pip-display {aggregateDr.poison > 0 ? 'pip-glow' : 'opacity-40'} text-2xl">
									{aggregateDr.poison}
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Favorite weapon stat block -->
				{#if favoriteWeapon}
					{@const meta = favoriteWeapon}
					<div
						class="border-t border-[var(--color-pip-green-dim)] pt-3"
						data-testid="favorite-weapon"
					>
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<div class="text-xs opacity-70">
								FAVORITE WEAPON
							</div>
							<div class="text-[0.7rem] opacity-60">
								(toggle with ★ on a weapon row below)
							</div>
						</div>
						<div class="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div>
								<div class="pip-display pip-glow text-xl">{meta.name || '[ unnamed ]'}</div>
								<div class="text-xs opacity-80">
									{SKILL_LABELS[meta.skill]} —
									<span class="pip-glow">TN {favoriteWeaponTn}</span>
								</div>
							</div>
							<div class="text-sm">
								<div>
									<span class="opacity-60">Damage:</span>
									<span class="pip-glow">{meta.damageCD} CD {meta.damageType}</span>
								</div>
								{#if meta.damageEffects}
									<div>
										<span class="opacity-60">Effects:</span>
										<span class="pip-glow">{meta.damageEffects}</span>
									</div>
								{/if}
							</div>
							<div class="text-sm">
								{#if meta.range}
									<div>
										<span class="opacity-60">Range:</span>
										<span class="pip-glow">{meta.range}</span>
									</div>
								{/if}
								{#if meta.fireRate}
									<div>
										<span class="opacity-60">Fire Rate:</span>
										<span class="pip-glow">{meta.fireRate}</span>
									</div>
								{/if}
								{#if meta.ammo}
									<div>
										<span class="opacity-60">Ammo:</span>
										<span class="pip-glow">{meta.ammo} ({meta.ammoQty})</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</section>

		<!-- Vault Dweller info -->
		{#if character.originKey === 'vaultDweller'}
			<section class="pip-panel" data-testid="vault-panel">
				<div class="pip-panel-header">VAULT-TEC FILE</div>
				<div class="grid gap-3 p-4 text-sm sm:grid-cols-3 sm:p-6">
					<label class="text-xs sm:col-span-1">
						<span class="opacity-70">VAULT #</span>
						<input
							class="pip-input mt-1"
							data-testid="vault-number-edit"
							bind:value={character.vaultNumber}
							maxlength="6"
						/>
					</label>
					<label class="text-xs sm:col-span-2">
						<span class="opacity-70"
							>EXPERIMENT / EARLY-LIFE NOTE — once per quest the GM may introduce a complication
							based on this, and you regain 1 Luck Point</span
						>
						<textarea
							class="pip-textarea mt-1 min-h-[4rem]"
							data-testid="vault-experiment-edit"
							bind:value={character.vaultExperiment}
						></textarea>
					</label>
				</div>
			</section>
		{/if}

		<!-- Mr. Handy chassis -->
		{#if character.originKey === 'misterHandy'}
			<section class="pip-panel" data-testid="handy-panel">
				<div class="pip-panel-header">MR. HANDY CHASSIS</div>
				<div class="space-y-4 p-4 sm:p-6">
					<div class="text-xs opacity-80">
						3 arm attachments determine your combat options + skill access. Swap any single
						arm below (INT + Repair test, 1 hour in fiction). Robot Mods occupy internal
						module slots (max 3, p.184).
						{#if !hasPincer}
							<span class="pip-glow-amber"
								>No pincer ⟹ Lockpick, Repair, and Throwing are unavailable.</span
							>
						{/if}
					</div>

					<div>
						<div class="text-xs opacity-70">
							PRESET LOADOUT (overwrites all 3 arms + plating)
						</div>
						<div class="mt-2 grid gap-2 sm:grid-cols-2">
							{#each MISTER_HANDY_VARIANTS as v (v.key)}
								{@const selected = character.misterHandyVariant === v.key}
								<button
									type="button"
									data-testid={`handy-variant-edit-${v.key}`}
									class="border-2 p-2 text-left text-xs transition {selected
										? 'border-[var(--color-pip-green)] bg-[rgba(21,255,96,0.08)]'
										: 'border-[var(--color-pip-green-dim)] hover:border-[var(--color-pip-green)]'}"
									onclick={() => setHandyVariant(v.key)}
								>
									<div class="pip-display pip-glow text-base">{v.name}</div>
									<div class="opacity-80">{v.persona}</div>
									<div class="mt-1">
										<span class="opacity-60">Arms:</span>
										{v.attachments.map((a) => ARM_ATTACHMENT_META[a].label).join(' · ')}
									</div>
								</button>
							{/each}
						</div>
					</div>

					<div>
						<div class="text-xs opacity-70">ARM ATTACHMENTS</div>
						<div class="mt-2 space-y-2" data-testid="handy-attachments">
							{#each character.misterHandyAttachments ?? [] as att, i (i)}
								{@const meta = ARM_ATTACHMENT_META[att as ArmAttachment]}
								<div class="border border-[var(--color-pip-green-dim)] p-2 text-xs">
									<div class="flex flex-wrap items-center gap-2">
										<span class="pip-display pip-glow text-base">ARM {i + 1}:</span>
										<select
											class="pip-input pip-select max-w-xs"
											data-testid={`handy-arm-${i}`}
											value={att}
											onchange={(e) =>
												setHandyArm(
													i,
													(e.target as HTMLSelectElement).value as ArmAttachment
												)}
										>
											{#each Object.keys(ARM_ATTACHMENT_META) as opt (opt)}
												<option value={opt}
													>{ARM_ATTACHMENT_META[opt as ArmAttachment].label}</option
												>
											{/each}
										</select>
										<span class="opacity-60">[{meta.rulebookPage}]</span>
									</div>

									<!-- Stat block -->
									<div class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
										<div>
											<span class="opacity-60">Skill:</span>
											<span class="pip-glow">{SKILL_LABELS[meta.skill]}</span>
										</div>
										<div>
											<span class="opacity-60">Damage:</span>
											<span class="pip-glow">{meta.damageCD} CD</span>
											<span class="opacity-60">({meta.damageType})</span>
										</div>
										{#if meta.fireRate !== undefined}
											<div>
												<span class="opacity-60">Fire Rate:</span>
												<span class="pip-glow">{meta.fireRate}</span>
											</div>
										{:else}
											<div>
												<span class="opacity-60">Kind:</span>
												<span class="pip-glow">{meta.kind}</span>
											</div>
										{/if}
										{#if meta.range}
											<div>
												<span class="opacity-60">Range:</span>
												<span class="pip-glow">{meta.range}</span>
											</div>
										{/if}
										{#if meta.ammo}
											<div class="sm:col-span-2">
												<span class="opacity-60">Ammo:</span>
												<span class="pip-glow">{meta.ammo}</span>
											</div>
										{/if}
										<div class="sm:col-span-2">
											<span class="opacity-60">Effects:</span>
											<span class="pip-glow">{meta.damageEffects}</span>
										</div>
										{#if meta.qualities}
											<div class="sm:col-span-4">
												<span class="opacity-60">Qualities:</span>
												<span class="pip-glow">{meta.qualities}</span>
											</div>
										{/if}
									</div>
									<div class="mt-2 opacity-80">{meta.notes}</div>
								</div>
							{/each}
						</div>
					</div>

					<div>
						<div class="text-xs opacity-70">PLATING</div>
						<div class="mt-2 flex flex-wrap items-center gap-2">
							<input
								class="pip-input max-w-md"
								data-testid="handy-plating-input"
								placeholder="e.g. Standard Plating"
								bind:value={character.misterHandyPlating}
							/>
						</div>
						<div class="mt-2 flex flex-wrap items-center gap-1">
							<div class="text-xs opacity-60">quick-pick:</div>
							{#each ROBOT_PLATING_PRESETS as p (p)}
								<button
									type="button"
									class="pip-btn px-2 py-0 text-xs"
									onclick={() => (character!.misterHandyPlating = p)}
								>
									{p}
								</button>
							{/each}
						</div>

						{#if findPlatingDef(character.misterHandyPlating)}
							{@const def = findPlatingDef(character.misterHandyPlating)!}
							<div
								class="mt-2 border border-[var(--color-pip-green-dim)] p-2 text-xs"
								data-testid="handy-plating-details"
							>
								<div class="pip-display pip-glow text-base">{def.name}</div>
								<div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
									<div>
										<span class="opacity-60">PHY DR:</span>
										<span class="pip-glow">+{def.dr.physical}</span>
									</div>
									<div>
										<span class="opacity-60">ENR DR:</span>
										<span class="pip-glow">+{def.dr.energy}</span>
									</div>
									<div>
										<span class="opacity-60">Carry:</span>
										<span class="pip-glow"
											>{def.carryWeightDelta >= 0 ? '+' : ''}{def.carryWeightDelta} lbs</span
										>
									</div>
								</div>
								{#if def.special}
									<div class="mt-1">
										<span class="opacity-60">Special:</span>
										<span class="pip-glow-amber">{def.special}</span>
									</div>
								{/if}
								<div class="mt-1 opacity-80">{def.notes}</div>
							</div>
						{:else if character.misterHandyPlating}
							<div class="mt-2 text-[0.7rem] opacity-60">
								[ unknown plating — type matches no rulebook entry ]
							</div>
						{/if}
					</div>

					<div>
						<div class="text-xs opacity-70 flex items-center justify-between">
							<span
								>ROBOT MODS ({(character.robotMods ?? []).length} / 3)
								{#if (character.robotMods ?? []).length > 3}
									<span class="pip-glow-amber"
										>⚠ exceeds rulebook limit of 3 mods</span
									>
								{/if}</span
							>
							<div class="flex items-center gap-1 no-print">
								<select
									class="pip-input pip-select max-w-xs text-xs"
									data-testid="handy-mod-add"
									value=""
									onchange={(e) => {
										const v = (e.target as HTMLSelectElement).value;
										if (!v) return;
										addRobotMod(v);
										(e.target as HTMLSelectElement).value = '';
									}}
								>
									<option value="">[ + add mod ]</option>
									{#each ROBOT_MODS as m (m.key)}
										<option value={m.key}>{m.name}</option>
									{/each}
									<option value="__custom">— Custom (write your own) —</option>
								</select>
							</div>
						</div>
						<ul class="mt-2 space-y-2 text-xs" data-testid="handy-mods-list">
							{#if (character.robotMods ?? []).length === 0}
								<li class="opacity-70">[ no modules installed ]</li>
							{/if}
							{#each character.robotMods ?? [] as m, i (m.id)}
								<li
									class="border border-[var(--color-pip-green-dim)] p-2"
									data-testid={`handy-mod-${i}`}
								>
									<div class="flex flex-wrap items-center justify-between gap-2">
										<input
											class="pip-input max-w-md"
											data-testid={`handy-mod-name-${i}`}
											placeholder="Mod name"
											bind:value={m.name}
										/>
										<button
											class="pip-btn pip-btn-danger px-2 py-0 text-center no-print"
											data-testid={`handy-mod-remove-${i}`}
											onclick={() => removeRobotMod(m.id)}>X</button
										>
									</div>
									<textarea
										class="pip-textarea mt-1 min-h-[3rem] text-[0.7rem]"
										data-testid={`handy-mod-effect-${i}`}
										placeholder="Effect / mechanical text"
										bind:value={m.effect}
									></textarea>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</section>
		{/if}

		<!-- Skills -->
		<section class="pip-panel">
			<div class="pip-panel-header">SKILLS</div>
			<div class="grid grid-cols-1 gap-1 p-4 sm:grid-cols-2 sm:p-6">
				{#each SKILL_KEYS as k (k)}
					{@const tag = isTagSkill(character, k)}
					{@const attr = SKILL_DEFAULT_ATTR[k]}
					{@const tn = applyOriginToBase(character).special[attr] + character.skills[k]}
					{@const blocked = isSkillBlockedByOrigin(character, k)}
					<div
						class="flex items-center justify-between border-b border-[var(--color-pip-green-dim)] py-1 text-sm {blocked
							? 'opacity-40'
							: ''}"
					>
						<div class="flex items-center gap-2">
							<span class="w-3 {tag ? 'pip-glow-amber' : 'opacity-30'}">{tag ? '★' : ' '}</span>
							<span>{SKILL_LABELS[k]}</span>
							<span class="text-xs opacity-60">[{SPECIAL_LABELS[attr].short}]</span>
							{#if blocked}<span class="text-xs opacity-70">[no pincer]</span>{/if}
						</div>
						<div class="flex items-center gap-2 font-mono">
							<input
								class="pip-input w-12 text-center"
								type="number"
								min="0"
								max={postLevelSkillCap}
								value={character.skills[k]}
								disabled={blocked}
								onchange={(e) =>
									(character!.skills[k] = clamp(
										parseInt((e.target as HTMLInputElement).value) || 0,
										0,
										postLevelSkillCap
									))}
							/>
							<span class="pip-glow w-10 text-right">TN {tn}</span>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Perks & traits -->
		<section class="pip-panel">
			<div class="pip-panel-header flex items-center justify-between">
				<span>PERKS &amp; TRAITS</span>
				<button
					class="text-xs underline no-print"
					data-testid="perk-add"
					onclick={() => (addPerkOpen = true)}>[ + add perk ]</button
				>
			</div>
			<div class="space-y-2 p-4 sm:p-6">
				{#if character.traits.length === 0 && character.perks.length === 0}
					<p class="text-sm opacity-70">[ none yet — use the level-up wizard or [ + add perk ] ]</p>
				{/if}
				{#if character.traits.length}
					<div>
						<div class="text-xs opacity-70">TRAITS</div>
						<ul class="ml-4 list-['»'] text-sm">
							{#each character.traits as t (t)}
								<li class="pl-2">{t}</li>
							{/each}
						</ul>
					</div>
				{/if}
				{#if character.perks.length}
					<div>
						<div class="text-xs opacity-70">PERKS</div>
						<ul class="space-y-1 text-sm" data-testid="perks-list">
							{#each character.perks as p, i (p.key)}
								{@const def = PERKS_BY_KEY[p.key]}
								{@const maxRank = def?.ranks ?? 1}
								<li
									class="border border-[var(--color-pip-green-dim)] p-2"
									data-testid={`perk-row-${i}`}
								>
									<div class="flex flex-wrap items-baseline justify-between gap-2">
										<div class="pip-display pip-glow text-base">
											{def?.name ?? p.key}
											<span class="opacity-60">(rank {p.rank}/{maxRank})</span>
										</div>
										<div class="flex items-center gap-1 no-print">
											<button
												class="pip-btn px-2 py-0 text-xs"
												data-testid={`perk-rank-down-${i}`}
												disabled={p.rank <= 1}
												onclick={() => bumpPerkRank(p.key, -1)}
												title="Decrease rank">−</button
											>
											<button
												class="pip-btn px-2 py-0 text-xs"
												data-testid={`perk-rank-up-${i}`}
												disabled={p.rank >= maxRank}
												onclick={() => bumpPerkRank(p.key, 1)}
												title="Increase rank">+</button
											>
											<button
												class="pip-btn pip-btn-danger px-2 py-0 text-xs"
												data-testid={`perk-remove-${i}`}
												onclick={() => removePerk(p.key)}
												title="Remove perk">X</button
											>
										</div>
									</div>
									<div class="mt-1 text-xs opacity-80">{def?.text ?? ''}</div>
									{#if def?.flavor}
										<div class="text-[0.7rem] opacity-60">→ {def.flavor}</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</section>

		<!-- Weapons -->
		<section class="pip-panel">
			<div class="pip-panel-header flex items-center justify-between">
				<span>WEAPONS</span>
				<button class="text-xs underline no-print" data-testid="weapon-add" onclick={addWeapon}
					>[ + add weapon ]</button
				>
			</div>
			<div class="space-y-3 p-4 sm:p-6" data-testid="weapons-list">
				{#if character.weapons.length === 0}
					<p class="text-sm opacity-70">[ unarmed ]</p>
				{/if}
				{#each character.weapons as w, i (w.id)}
					{@const skillAttr = SKILL_DEFAULT_ATTR[w.skill]}
					{@const skillRank = character.skills[w.skill]}
					{@const finalSpecial = applyOriginToBase(character).special}
					{@const weaponTn = finalSpecial[skillAttr] + skillRank}
					<div
						class="grid grid-cols-12 gap-1 border border-[var(--color-pip-green-dim)] p-2 text-xs"
						data-testid={`weapon-row-${i}`}
					>
						<input
							class="pip-input col-span-6 sm:col-span-4"
							placeholder="Name (e.g. 10mm Pistol)"
							data-testid={`weapon-name-${i}`}
							bind:value={w.name}
						/>
						<label class="col-span-6 sm:col-span-2 text-[0.7rem]">
							<span class="opacity-70">SKILL</span>
							<select class="pip-input pip-select" bind:value={w.skill}>
								{#each SKILL_KEYS as sk (sk)}
									<option value={sk}>{SKILL_LABELS[sk]}</option>
								{/each}
							</select>
						</label>
						<label class="col-span-3 sm:col-span-1 text-[0.7rem]">
							<span class="opacity-70">CD</span>
							<input
								class="pip-input"
								type="number"
								min="0"
								max="20"
								bind:value={w.damageCD}
							/>
						</label>
						<label class="col-span-3 sm:col-span-1 text-[0.7rem]">
							<span class="opacity-70">TYPE</span>
							<select class="pip-input pip-select" bind:value={w.damageType}>
								<option value="physical">Phys</option>
								<option value="energy">Enrg</option>
								<option value="radiation">Rad</option>
								<option value="poison">Psn</option>
							</select>
						</label>
						<label class="col-span-3 sm:col-span-1 text-[0.7rem]">
							<span class="opacity-70">RANGE</span>
							<input
								class="pip-input"
								placeholder="C/M/L/X"
								bind:value={w.range}
							/>
						</label>
						<label class="col-span-3 sm:col-span-1 text-[0.7rem]">
							<span class="opacity-70">FR</span>
							<input
								class="pip-input"
								type="number"
								min="0"
								max="6"
								bind:value={w.fireRate}
							/>
						</label>
						<label class="col-span-3 sm:col-span-1 text-[0.7rem]">
							<span class="opacity-70">QTY</span>
							<input
								class="pip-input"
								type="number"
								min="1"
								bind:value={w.qty}
							/>
						</label>
						<label class="col-span-3 sm:col-span-1 text-[0.7rem]">
							<span class="opacity-70">LBS</span>
							<input
								class="pip-input"
								type="number"
								min="0"
								step="0.1"
								bind:value={w.weight}
							/>
						</label>
						<label class="col-span-6 sm:col-span-3 text-[0.7rem]">
							<span class="opacity-70">AMMO</span>
							<input class="pip-input" placeholder="10mm, fusion cell, …" bind:value={w.ammo} />
						</label>
						<label class="col-span-3 sm:col-span-1 text-[0.7rem]">
							<span class="opacity-70">#</span>
							<input
								class="pip-input"
								type="number"
								min="0"
								bind:value={w.ammoQty}
							/>
						</label>
						<label class="col-span-9 sm:col-span-5 text-[0.7rem]">
							<span class="opacity-70">EFFECTS / QUALITIES</span>
							<input
								class="pip-input"
								placeholder="Vicious, Piercing 1, Burst, Two-Handed…"
								bind:value={w.damageEffects}
							/>
						</label>
						<label class="col-span-9 sm:col-span-2 text-[0.7rem]">
							<span class="opacity-70">MODS</span>
							<input
								class="pip-input"
								placeholder="Long barrel, recoil comp"
								bind:value={w.mods}
							/>
						</label>
						<div class="col-span-12 flex items-center justify-between gap-2 pt-1 text-[0.7rem]">
							<div class="opacity-80">
								Rolls <span class="pip-glow">{SPECIAL_LABELS[skillAttr].short} + {SKILL_LABELS[w.skill]}</span>
								— TN <span class="pip-glow">{weaponTn}</span>, damage <span class="pip-glow">{w.damageCD} CD {w.damageType}</span>
							</div>
							<div class="flex items-center gap-1 no-print">
								<button
									type="button"
									class="pip-btn px-2 py-0 text-center"
									class:pip-glow-amber={character.favoriteWeaponId === w.id}
									data-testid={`weapon-fav-${i}`}
									onclick={() => toggleFavoriteWeapon(w.id)}
									title={character.favoriteWeaponId === w.id
										? 'Favorite — click to unset'
										: 'Mark as favorite (pinned at top)'}
								>
									{character.favoriteWeaponId === w.id ? '★' : '☆'}
								</button>
								<button
									class="pip-btn pip-btn-danger px-2 py-0 text-center"
									data-testid={`weapon-remove-${i}`}
									onclick={() => removeWeapon(w.id)}>X</button
								>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Armor -->
		<section class="pip-panel">
			<div class="pip-panel-header flex items-center justify-between">
				<span>ARMOR</span>
				<button class="text-xs underline no-print" data-testid="armor-add" onclick={addArmor}
					>[ + add armor ]</button
				>
			</div>
			<div class="space-y-3 p-4 sm:p-6" data-testid="armor-list">
				{#if character.armor.length === 0}
					<p class="text-sm opacity-70">[ unarmored ]</p>
				{/if}
				{#each character.armor as a, i (a.id)}
					{@const warn = isUnfitArmorForSuperMutant(a)}
					<div
						class="space-y-2 border p-2 text-xs {warn
							? 'border-[var(--color-pip-amber)]'
							: 'border-[var(--color-pip-green-dim)]'}"
						data-testid={`armor-row-${i}`}
					>
						<!-- Item header row: name, weight, worn, remove -->
						<div class="grid grid-cols-12 items-end gap-1">
							<label class="col-span-12 sm:col-span-7 text-[0.7rem]">
								<span class="opacity-70">ITEM</span>
								<input
									class="pip-input"
									placeholder="Piece (e.g. Combat Armor, Drifter Outfit)"
									data-testid={`armor-name-${i}`}
									bind:value={a.name}
								/>
							</label>
							<label class="col-span-4 sm:col-span-2 text-[0.7rem]">
								<span class="opacity-70">LBS</span>
								<input
									class="pip-input"
									type="number"
									min="0"
									step="0.1"
									bind:value={a.weight}
								/>
							</label>
							<label class="col-span-5 sm:col-span-2 flex items-center gap-1 text-[0.7rem]">
								<input type="checkbox" bind:checked={a.equipped} />
								<span>Worn</span>
							</label>
							<div class="col-span-3 sm:col-span-1 flex justify-end">
								<button
									class="pip-btn pip-btn-danger px-2 py-0 text-center no-print"
									data-testid={`armor-remove-${i}`}
									onclick={() => removeArmor(a.id)}
									title="Remove armor item">X</button
								>
							</div>
						</div>

						<!-- Coverage rows: 1-to-many (location, dr) -->
						<div class="space-y-1">
							<div class="flex items-center justify-between text-[0.65rem] opacity-70">
								<span>COVERAGE — one entry per protected location</span>
								<button
									type="button"
									class="text-xs underline no-print"
									data-testid={`armor-cov-add-${i}`}
									onclick={() => addArmorCoverage(a.id)}
									title="Add another location (e.g. clothing covers Arms + Legs + Torso)"
									>[ + add location ]</button
								>
							</div>
							{#if (a.coverage ?? []).length === 0}
								<div class="opacity-60">[ no locations — add at least one ]</div>
							{/if}
							{#each a.coverage as cov, j (j)}
								<div
									class="grid grid-cols-12 gap-1"
									data-testid={`armor-cov-${i}-${j}`}
								>
									<label class="col-span-12 sm:col-span-3 text-[0.65rem]">
										<span class="opacity-70">LOCATION</span>
										<select
											class="pip-input pip-select"
											data-testid={`armor-cov-location-${i}-${j}`}
											bind:value={cov.location}
										>
											{#each BODY_LOCATIONS as loc (loc)}
												<option value={loc}>{BODY_LOCATION_LABELS[loc]}</option>
											{/each}
										</select>
									</label>
									<label class="col-span-3 sm:col-span-2 text-[0.65rem]">
										<span class="opacity-70">PHY</span>
										<input
											class="pip-input"
											type="number"
											min="0"
											bind:value={cov.dr.physical}
										/>
									</label>
									<label class="col-span-3 sm:col-span-2 text-[0.65rem]">
										<span class="opacity-70">ENR</span>
										<input
											class="pip-input"
											type="number"
											min="0"
											bind:value={cov.dr.energy}
										/>
									</label>
									<label class="col-span-3 sm:col-span-2 text-[0.65rem]">
										<span class="opacity-70">RAD</span>
										<input
											class="pip-input"
											type="number"
											min="0"
											bind:value={cov.dr.radiation}
										/>
									</label>
									<label class="col-span-2 sm:col-span-2 text-[0.65rem]">
										<span class="opacity-70">PSN</span>
										<input
											class="pip-input"
											type="number"
											min="0"
											bind:value={cov.dr.poison}
										/>
									</label>
									<div class="col-span-1 sm:col-span-1 flex items-end justify-end">
										<button
											class="pip-btn pip-btn-danger px-2 py-0 text-center no-print"
											data-testid={`armor-cov-remove-${i}-${j}`}
											disabled={a.coverage.length <= 1}
											onclick={() => removeArmorCoverage(a.id, j)}
											title="Remove this location">X</button
										>
									</div>
								</div>
							{/each}
						</div>

						{#if warn}
							<div class="pip-glow-amber text-[0.7rem]">
								⚠ Super mutants can only wear Raider armor (rename to include "Raider" if intentional).
							</div>
						{/if}
					</div>
				{/each}

				{#if armorByLocation}
					<details class="border border-[var(--color-pip-green-dim)] p-2 text-xs">
						<summary class="cursor-pointer"
							>[ ? ] DR by location (highest equipped per location · p.122)</summary
						>
						<table class="mt-2 w-full border-collapse text-center">
							<thead>
								<tr class="opacity-70">
									<th class="border border-[var(--color-pip-green-dim)] p-1 text-left">Location</th>
									{#each DAMAGE_TYPES as dt (dt)}
										<th class="border border-[var(--color-pip-green-dim)] p-1">{DAMAGE_TYPE_LABELS[dt]}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each BODY_LOCATIONS as loc (loc)}
									<tr>
										<td class="border border-[var(--color-pip-green-dim)] p-1 text-left">
											{BODY_LOCATION_LABELS[loc]}
										</td>
										{#each DAMAGE_TYPES as dt (dt)}
											{@const v = armorByLocation[loc][dt]}
											<td
												class="border border-[var(--color-pip-green-dim)] p-1 {v > 0
													? 'pip-glow'
													: 'opacity-40'}">{v}</td
											>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</details>
				{/if}
			</div>
		</section>

		<!-- Inventory -->
		<section class="pip-panel">
			<div class="pip-panel-header flex items-center justify-between">
				<span>INVENTORY</span>
				<button class="text-xs underline no-print" data-testid="inv-add" onclick={addInventoryItem}>[ + add item ]</button>
			</div>
			<div class="space-y-2 p-4 sm:p-6" data-testid="inv-list">
				{#if character.inventory.length === 0}
					<p class="text-sm opacity-70">[ pockets empty ]</p>
				{/if}
				{#each character.inventory as item, i (item.id)}
					<div class="grid grid-cols-12 gap-1 text-xs" data-testid={`inv-row-${i}`}>
						<input class="pip-input col-span-5" placeholder="Name" data-testid={`inv-name-${i}`} bind:value={item.name} />
						<input
							class="pip-input col-span-1"
							type="number"
							min="1"
							placeholder="Qty"
							data-testid={`inv-qty-${i}`}
							bind:value={item.qty}
						/>
						<input
							class="pip-input col-span-1"
							type="number"
							min="0"
							step="0.1"
							placeholder="lbs"
							data-testid={`inv-weight-${i}`}
							bind:value={item.weight}
						/>
						<input class="pip-input col-span-4" placeholder="Notes" data-testid={`inv-notes-${i}`} bind:value={item.notes} />
						<button
							class="pip-btn pip-btn-danger col-span-1 px-1 py-0 text-center no-print"
							data-testid={`inv-remove-${i}`}
							onclick={() => removeInventoryItem(item.id)}>X</button
						>
					</div>
				{/each}
			</div>
		</section>

		<!-- Trinket + Notes -->
		<section class="pip-panel">
			<div class="pip-panel-header">PERSONAL TRINKET &amp; NOTES</div>
			<div class="space-y-3 p-4 sm:p-6">
				<label class="block text-xs">
					<span class="opacity-70"
						>TRINKET — once per quest, gaze at it to regain 1 Luck Point (p.79)</span
					>
					<input
						class="pip-input mt-1"
						data-testid="trinket-input"
						bind:value={character.trinket}
						placeholder="e.g. A pre-war gold pocket watch"
					/>
				</label>
				<label class="block text-xs">
					<span class="opacity-70">NOTES</span>
					<textarea
						class="pip-textarea mt-1 min-h-[10rem]"
						data-testid="notes-input"
						bind:value={character.notes}
					></textarea>
				</label>
			</div>
		</section>

		<!-- Actions -->
		<div class="flex flex-wrap items-center gap-2 no-print">
			<button
				class="pip-btn"
				class:pip-glow-amber={saveStatus === 'saving' || saveStatus === 'pending'}
				data-testid="save-btn"
				disabled={saveStatus === 'saving'}
				onclick={save}
				title="Edits auto-save ~400ms after you blur a field. Click to flush immediately."
			>
				{#if saveStatus === 'saving'}
					[ saving… ]
				{:else if saveStatus === 'pending'}
					[ ⏳ pending… ]
				{:else if saveStatus === 'saved'}
					[ ✓ saved ]
				{:else if saveStatus === 'error'}
					[ ⚠ save failed — retry ]
				{:else}
					[ ✓ saved · auto ]
				{/if}
			</button>
			{#if saveStatus === 'error' && saveError}
				<span class="pip-glow-amber text-xs">{saveError}</span>
			{/if}
			<button class="pip-btn" onclick={() => window.print()}>[ ⎙ ] Print sheet</button>
			<a class="pip-btn" href="/">‹ Back to roster</a>
			<button class="pip-btn pip-btn-danger ml-auto" data-testid="delete-btn" onclick={remove}>[ X ] Delete</button>
		</div>
	</div>

	<!-- Level-up modal -->
	{#if levelUpOpen}
		<div
			class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/80 p-4 no-print"
			data-testid="levelup-modal"
		>
			<div class="pip-panel my-8 w-full max-w-2xl">
				<div class="pip-panel-header flex items-center justify-between">
					<span>LEVEL UP → L{nextLevel}</span>
					<button
						class="text-xs underline"
						data-testid="levelup-close"
						onclick={() => (levelUpOpen = false)}>[ × close ]</button
					>
				</div>
				<div class="space-y-4 p-4 sm:p-6">
					<div class="text-xs opacity-80">
						Per the rulebook (Core Rulebook p.74-75), each level grants <span class="pip-glow">+1 max HP</span>
						(auto-applied via the HP formula), <span class="pip-glow">+1 skill rank</span> in a skill of
						your choice (cap {postLevelSkillCap}), and <span class="pip-glow">1 perk</span> — new or rank-up.
					</div>

					<div>
						<div class="text-xs opacity-70">PICK A SKILL TO RAISE BY +1</div>
						<div class="mt-2 grid gap-1 sm:grid-cols-2">
							{#each SKILL_KEYS as k (k)}
								{@const blocked = isSkillBlockedByOrigin(character, k)}
								{@const cur = character.skills[k]}
								{@const atCap = cur >= postLevelSkillCap}
								<button
									type="button"
									data-testid={`levelup-skill-${k}`}
									disabled={blocked || atCap}
									class="border p-1 text-left text-xs transition {levelUpSkill === k
										? 'border-[var(--color-pip-green)] bg-[rgba(21,255,96,0.08)]'
										: blocked || atCap
											? 'border-[var(--color-pip-green-dim)] opacity-40'
											: 'border-[var(--color-pip-green-dim)] hover:border-[var(--color-pip-green)]'}"
									onclick={() => (levelUpSkill = k)}
								>
									{SKILL_LABELS[k]} <span class="opacity-60">({cur} → {Math.min(cur + 1, postLevelSkillCap)})</span>
									{#if blocked}<span class="opacity-70"> [no pincer]</span>{/if}
									{#if atCap}<span class="pip-glow-amber"> [max]</span>{/if}
								</button>
							{/each}
						</div>
					</div>

					<div>
						<div class="text-xs opacity-70">PICK A PERK (new or rank-up)</div>
						<div class="mt-2 max-h-72 overflow-y-auto border border-[var(--color-pip-green-dim)] p-1">
							{#if levelUpPerksAvailable.length === 0}
								<p class="p-2 text-xs opacity-70">[ no perks currently meet your requirements ]</p>
							{/if}
							{#each levelUpPerksAvailable as p (p.key)}
								{@const existing = character.perks.find((pp) => pp.key === p.key)}
								<button
									type="button"
									data-testid={`levelup-perk-${p.key}`}
									class="block w-full border-b border-[var(--color-pip-green-dim)] p-2 text-left text-xs transition {levelUpPerkKey ===
									p.key
										? 'bg-[rgba(21,255,96,0.12)]'
										: 'hover:bg-[rgba(21,255,96,0.05)]'}"
									onclick={() => (levelUpPerkKey = p.key)}
								>
									<div class="pip-display pip-glow text-base">
										{p.name}
										{#if existing}
											<span class="opacity-60">(rank {existing.rank} → {existing.rank + 1})</span>
										{:else}
											<span class="opacity-60">(new)</span>
										{/if}
									</div>
									<div class="opacity-80">{p.text}</div>
								</button>
							{/each}
						</div>
					</div>

					<div class="flex items-center justify-end gap-2">
						<button class="pip-btn" onclick={() => (levelUpOpen = false)}>Cancel</button>
						<button
							class="pip-btn pip-glow-amber"
							data-testid="levelup-confirm"
							disabled={!levelUpSkill || !levelUpPerkKey}
							onclick={applyLevelUp}
						>
							[ ✓ ] Confirm Level Up
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Add-perk modal (sheet-level edit, not level-up) -->
	{#if addPerkOpen}
		<div
			class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/80 p-4 no-print"
			data-testid="addperk-modal"
		>
			<div class="pip-panel my-8 w-full max-w-2xl">
				<div class="pip-panel-header flex items-center justify-between">
					<span>ADD PERK (sheet edit)</span>
					<button
						class="text-xs underline"
						data-testid="addperk-close"
						onclick={() => (addPerkOpen = false)}>[ × close ]</button
					>
				</div>
				<div class="space-y-3 p-4 sm:p-6">
					<div class="text-xs opacity-80">
						Pick a perk to add or rank up. Requirements are checked against your <em
							>current</em
						>
						level; unmet perks are dimmed but still selectable (so you can correct mistakes or
						handle homebrew). For book-legal advancement, use the
						<span class="pip-glow">[ ↑ LEVEL UP ]</span> wizard instead.
					</div>

					<div class="flex flex-wrap items-center gap-2 text-xs">
						<span class="opacity-70">FILTER:</span>
						<button
							class="pip-btn px-2 py-0 text-xs {addPerkFilter === 'all'
								? 'bg-[var(--color-pip-green-dim)] text-[#001500]'
								: ''}"
							onclick={() => (addPerkFilter = 'all')}>All</button
						>
						{#each PERK_CATEGORIES_LIST as cat (cat)}
							<button
								class="pip-btn px-2 py-0 text-xs {addPerkFilter === cat
									? 'bg-[var(--color-pip-green-dim)] text-[#001500]'
									: ''}"
								onclick={() => (addPerkFilter = cat)}
								>{CATEGORY_LABELS[cat].split(' — ')[0]}</button
							>
						{/each}
						<label class="ml-auto flex items-center gap-1">
							<input type="checkbox" bind:checked={addPerkShowUnavailable} />
							<span>Show unavailable</span>
						</label>
					</div>

					<div
						class="max-h-[60vh] space-y-1 overflow-y-auto border border-[var(--color-pip-green-dim)] p-1"
					>
						{#each addPerkVisible as p (p.key)}
							{@const reason = perkUnmetForAdd(p)}
							{@const already = character.perks.find((pp) => pp.key === p.key)}
							{@const maxedOut = Boolean(already && p.ranks && already.rank >= p.ranks)}
							<button
								type="button"
								data-testid={`addperk-pick-${p.key}`}
								disabled={maxedOut}
								class="block w-full border-b border-[var(--color-pip-green-dim)] p-2 text-left text-xs transition {maxedOut
									? 'opacity-40'
									: reason
										? 'opacity-70 hover:bg-[rgba(255,176,0,0.05)]'
										: 'hover:bg-[rgba(21,255,96,0.05)]'}"
								onclick={() => {
									addPerk(p.key);
									addPerkOpen = false;
								}}
							>
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<div class="pip-display pip-glow text-base">
										{p.name}
										<span class="opacity-60">
											({p.ranks} rank{p.ranks > 1 ? 's' : ''})
										</span>
										{#if already}
											<span class="pip-glow-amber text-xs">
												[have rank {already.rank}{maxedOut ? ' — maxed' : ' — clicking ranks up'}]
											</span>
										{/if}
									</div>
									<div class="text-xs">
										{#if reason && !maxedOut}
											<span class="pip-glow-amber">⚠ {reason} (still selectable)</span>
										{:else if !reason}
											<span class="opacity-60"
												>{CATEGORY_LABELS[p.category].split(' — ')[0]}</span
											>
										{/if}
									</div>
								</div>
								<div class="mt-1 opacity-80">{p.text}</div>
								{#if p.flavor}
									<div class="mt-1 text-[0.7rem] opacity-60">→ {p.flavor}</div>
								{/if}
							</button>
						{:else}
							<p class="p-2 opacity-70 text-xs">[ no perks match this filter ]</p>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}
