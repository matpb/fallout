<script lang="ts">
	import { goto } from '$app/navigation';
	import { ORIGINS, ORIGIN_BY_KEY, SURVIVOR_TRAITS } from '$lib/fallout/origins';
	import { PERKS, PERKS_BY_KEY, CATEGORY_LABELS, type PerkCategory, type PerkDef } from '$lib/fallout/perks';
	import {
		SKILL_KEYS,
		SKILL_LABELS,
		SKILL_DESCRIPTIONS,
		SKILL_DEFAULT_ATTR,
		SPECIAL_KEYS,
		SPECIAL_LABELS,
		type OriginKey,
		type SkillKey,
		type SpecialKey
	} from '$lib/fallout/types';
	import { applyOriginToBase, createBlankCharacter } from '$lib/fallout/factory';
	import { deriveAll, specialMaxFor } from '$lib/fallout/derived';
	import { characters } from '$lib/store.svelte';

	type Step = 1 | 2 | 3 | 4 | 5 | 6;
	let step = $state<Step>(1);
	let working = $state(createBlankCharacter('survivor'));

	let origin = $derived(ORIGIN_BY_KEY[working.originKey]);

	function setOrigin(k: OriginKey) {
		// Re-init keeping name
		const name = working.name;
		const fresh = createBlankCharacter(k);
		fresh.name = name;
		working = fresh;
	}

	// SPECIAL — 5 points to spend over base 5 each
	let specialBase = $derived(applyOriginToBase({ ...working }).special);
	let specialSpent = $derived(
		SPECIAL_KEYS.reduce((s, k) => s + Math.max(0, working.special[k] - 5), 0)
	);
	let specialRefunded = $derived(
		SPECIAL_KEYS.reduce((s, k) => s + Math.max(0, 5 - working.special[k]), 0)
	);
	let specialBudget = $derived(5 + specialRefunded);
	let specialRemaining = $derived(specialBudget - specialSpent);

	function bumpSpecial(k: SpecialKey, dir: 1 | -1) {
		const v = working.special[k] + dir;
		const cap = specialMaxFor(working, k);
		if (v < 4 || v > cap) return;
		// If increasing, must have remaining budget; if decreasing below 5, must not exceed -1 below default.
		if (dir === 1 && specialRemaining <= 0) return;
		working.special[k] = v;
	}

	// Tag skill picks
	let baseTagCount = $derived(3);
	let originExtraTag = $derived(origin.extraTagSkill === 'any' ? 1 : 0);
	let originLockedTag = $derived(working.originKey === 'ghoul' ? 1 : 0); // Survival auto-tag
	let educatedExtra = $derived(working.traits.includes('educated') ? 1 : 0);
	let brotherhoodNeed = $derived(origin.extraTagSkillFrom ? 1 : 0);
	let totalTagAllowed = $derived(baseTagCount + originExtraTag + educatedExtra + brotherhoodNeed);

	function toggleTag(k: SkillKey) {
		const i = working.tagSkills.indexOf(k);
		if (i >= 0) {
			// Don't allow removing the auto Ghoul Survival tag
			if (working.originKey === 'ghoul' && k === 'survival') return;
			working.tagSkills.splice(i, 1);
			working.tagSkills = [...working.tagSkills];
			// If skill rank was 2 only because of tag, drop back to 0
			if (working.skills[k] === 2) working.skills[k] = 0;
		} else {
			if (working.tagSkills.length >= totalTagAllowed) return;
			working.tagSkills.push(k);
			working.tagSkills = [...working.tagSkills];
			if (working.skills[k] < 2) working.skills[k] = 2;
		}
	}

	// Skill points budget
	let skillBudget = $derived(9 + working.special.intelligence);
	let skillSpent = $derived(
		SKILL_KEYS.reduce((s, k) => {
			const r = working.skills[k];
			const tagBase = working.tagSkills.includes(k) ? 2 : 0;
			return s + Math.max(0, r - tagBase);
		}, 0)
	);
	let skillRemaining = $derived(skillBudget - skillSpent);
	let skillRankCap = $derived(working.originKey === 'superMutant' ? 3 : 3); // creation cap = 3

	function bumpSkill(k: SkillKey, dir: 1 | -1) {
		const v = working.skills[k] + dir;
		const tagBase = working.tagSkills.includes(k) ? 2 : 0;
		const max = working.originKey === 'superMutant' ? Math.min(3, 4) : 3;
		if (v < tagBase || v > max) return;
		if (dir === 1 && skillRemaining <= 0) return;
		working.skills[k] = v;
	}

	// Survivor traits (max 2)
	function toggleSurvivorTrait(key: string) {
		const i = working.traits.indexOf(key);
		if (i >= 0) {
			working.traits.splice(i, 1);
			working.traits = [...working.traits];
		} else {
			if (working.traits.length >= 2) return;
			working.traits.push(key);
			working.traits = [...working.traits];
		}
	}

	// Perk pick
	let chosenPerkKey = $state<string>('');
	let perkFilter = $state<'all' | PerkCategory>('all');
	let showUnavailable = $state(true);

	function unmetReason(p: PerkDef): string | null {
		if (p.requirements.notRobot && working.originKey === 'misterHandy') return 'Not available to robots';
		if (p.requirements.level && working.level < p.requirements.level) {
			return `Needs Level ${p.requirements.level}`;
		}
		if (p.requirements.special) {
			const missing: string[] = [];
			for (const [k, min] of Object.entries(p.requirements.special)) {
				const cur = working.special[k as SpecialKey];
				if (cur < (min as number)) {
					missing.push(`${SPECIAL_LABELS[k as SpecialKey].short} ${cur}/${min}`);
				}
			}
			if (missing.length) return `Needs ${missing.join(', ')}`;
		}
		return null;
	}
	function meetsRequirements(perkKey: string): boolean {
		const p = PERKS_BY_KEY[perkKey];
		if (!p) return false;
		return unmetReason(p) === null;
	}

	let visiblePerks = $derived(
		PERKS.filter((p) => {
			if (perkFilter !== 'all' && p.category !== perkFilter) return false;
			if (!showUnavailable && !meetsRequirements(p.key)) return false;
			return true;
		}).sort((a, b) => {
			// Available first, then by name
			const aOk = meetsRequirements(a.key) ? 0 : 1;
			const bOk = meetsRequirements(b.key) ? 0 : 1;
			if (aOk !== bOk) return aOk - bOk;
			return a.name.localeCompare(b.name);
		})
	);

	const PERK_CATEGORIES: PerkCategory[] = [
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

	let derived_ = $derived(deriveAll(applyOriginToBase(working)));

	function canAdvance(): boolean {
		if (step === 1) return !!working.originKey && working.name.trim().length > 0;
		if (step === 2) return specialRemaining === 0;
		if (step === 3) {
			if (working.originKey === 'survivor' && working.traits.length !== 2) return false;
			return working.tagSkills.length === totalTagAllowed && skillRemaining === 0;
		}
		if (step === 4) return chosenPerkKey !== '';
		return true;
	}

	function next() {
		if (!canAdvance()) return;
		if (step === 4 && chosenPerkKey) {
			working.perks = [{ key: chosenPerkKey, rank: 1 }];
		}
		step = (step + 1) as Step;
	}
	function prev() {
		if (step > 1) step = (step - 1) as Step;
	}

	async function finish() {
		try {
			// Deep clone so origin-bonus mutation doesn't ripple back into reactive state
			const final = structuredClone($state.snapshot(working));
			const withBonus = applyOriginToBase(final);
			const d = deriveAll(withBonus);
			withBonus.currentHp = d.maxHp;
			withBonus.currentLuck = d.maxLuck;
			console.log('[finish] saving character', withBonus.id, withBonus.name);
			await characters.upsert(withBonus);
			console.log('[finish] saved, navigating');
			await goto(`/character/${withBonus.id}`);
		} catch (err) {
			console.error('[finish] FAILED', err);
			throw err;
		}
	}

	const stepLabels: Record<Step, string> = {
		1: 'Origin',
		2: 'S.P.E.C.I.A.L.',
		3: 'Skills',
		4: 'Perk',
		5: 'Trinket',
		6: 'Confirm'
	};
</script>

<svelte:head>
	<title>Pip-Boy 3000 — New Character</title>
</svelte:head>

<section class="pip-panel">
	<div class="pip-panel-header flex items-center justify-between">
		<span>NEW &gt; STEP {step} OF 6 — {stepLabels[step]}</span>
		<span class="text-xs">{working.name || '[unnamed]'}</span>
	</div>
	<div class="p-4 sm:p-6">
		<!-- Step indicator -->
		<div class="mb-4 flex flex-wrap gap-1 text-xs">
			{#each [1, 2, 3, 4, 5, 6] as s (s)}
				<span
					class="border px-2 py-1 {s === step
						? 'border-[var(--color-pip-green)] bg-[var(--color-pip-green)] text-[#001500]'
						: s < step
							? 'border-[var(--color-pip-green-dim)] opacity-70'
							: 'border-[var(--color-pip-green-dim)] opacity-40'}"
				>
					{s}. {stepLabels[s as Step]}
				</span>
			{/each}
		</div>

		{#if step === 1}
			<div class="space-y-4">
				<details class="border border-[var(--color-pip-green-dim)] p-3 text-xs">
					<summary class="cursor-pointer text-sm">[ ? ] First time? Read this.</summary>
					<div class="mt-2 space-y-2 opacity-90">
						<p>
							<em>Fallout: The Roleplaying Game</em> (Modiphius) is a tabletop game using the
							<span class="pip-glow">2d20 system</span>. You play a character in the post-nuclear wasteland
							— shooting raiders, scavenging ruins, modding gear, dealing with mutants and faction politics.
						</p>
						<p>
							This wizard walks you through the 6 steps from the rulebook: pick an
							<span class="pip-glow">Origin</span> (your species/background), distribute
							<span class="pip-glow">S.P.E.C.I.A.L.</span> attribute points, choose
							<span class="pip-glow-amber">Tag Skills</span> + spend skill points, pick a starting
							<span class="pip-glow">Perk</span>, set a trinket, confirm.
						</p>
						<p class="opacity-70">
							Each step has a [ ? ] expandable explainer like this one. Hit "Next ›" when you're done.
						</p>
					</div>
				</details>

				<label class="block">
					<span class="text-xs opacity-70">CHARACTER NAME</span>
					<input class="pip-input mt-1" bind:value={working.name} maxlength="40" />
				</label>
				<div>
					<div class="text-xs opacity-70">CHOOSE ORIGIN — your species and background</div>
					<div class="mt-2 grid gap-3 sm:grid-cols-2">
						{#each ORIGINS as o (o.key)}
							<button
								type="button"
								class="border-2 p-3 text-left transition {working.originKey === o.key
									? 'border-[var(--color-pip-green)] bg-[rgba(21,255,96,0.08)]'
									: 'border-[var(--color-pip-green-dim)] hover:border-[var(--color-pip-green)]'}"
								onclick={() => setOrigin(o.key)}
							>
								<div class="pip-display pip-glow text-lg">{o.name}</div>
								<div class="text-xs opacity-80">{o.tagline}</div>
							</button>
						{/each}
					</div>
				</div>
				<div class="pip-panel mt-2">
					<div class="pip-panel-header">TRAIT — {origin.traitName}</div>
					<div class="space-y-2 p-3 text-sm">
						<p>{origin.traitText}</p>
						<ul class="list-inside list-['»'] pl-2 text-xs opacity-80">
							{#each origin.notes as n (n)}
								<li>{n}</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		{:else if step === 2}
			<div class="space-y-4">
				<details class="border border-[var(--color-pip-green-dim)] p-3 text-xs">
					<summary class="cursor-pointer text-sm">[ ? ] What is S.P.E.C.I.A.L.?</summary>
					<div class="mt-2 space-y-2 opacity-90">
						<p>
							S.P.E.C.I.A.L. is the seven-attribute backbone of Fallout. Every skill test rolls
							<span class="pip-glow">2d20 ≤ (attribute + skill rank)</span>. Higher attributes mean more dice land under the target number, more
							successes, more Action Points to spend.
						</p>
						<p>
							You start with 5 in each, get 5 points to spend (max 10 per stat). Drop one to 4 to free up an
							extra point. Some origins shift these caps: Super Mutant maxes STR/END at 12 but caps INT/CHA at 6;
							Mister Handy ignores STR for carry weight.
						</p>
						<p class="opacity-70">
							Tip: a focused 8/7/6/6/5/4/4 spread tends to play better than balanced 6/6/6/6/6/5/5 in this
							system, because tag skills + concentrated SPECIAL hit critical thresholds for perks.
						</p>
					</div>
				</details>
				<p class="text-sm opacity-80">
					&gt; All attributes start at 5. Spend points to raise. Drop one below 5 to gain a point.
					{#if origin.specialBonuses}
						Origin bonus applied at finish: {Object.entries(origin.specialBonuses)
							.map(([k, v]) => `${SPECIAL_LABELS[k as SpecialKey].short} +${v}`)
							.join(', ')}.
					{/if}
				</p>
				<div class="text-sm">
					&gt; Points remaining:
					<span class="pip-glow text-xl">{specialRemaining}</span> / {specialBudget}
				</div>
				<div class="grid gap-2">
					{#each SPECIAL_KEYS as k (k)}
						{@const max = specialMaxFor(working, k)}
						{@const meta = SPECIAL_LABELS[k]}
						<div class="border border-[var(--color-pip-green-dim)] p-3">
							<div class="flex items-center justify-between gap-2">
								<div>
									<div class="pip-display pip-glow text-lg">
										{meta.short} — <span class="opacity-80">{meta.full}</span>
									</div>
									<div class="text-xs opacity-80">{meta.summary}</div>
								</div>
								<div class="flex shrink-0 items-center gap-2">
									<button
										class="pip-btn px-3 py-0 text-lg"
										onclick={() => bumpSpecial(k, -1)}
										disabled={working.special[k] <= 4}>-</button
									>
									<span class="pip-glow w-8 text-center text-xl">{working.special[k]}</span>
									<button
										class="pip-btn px-3 py-0 text-lg"
										onclick={() => bumpSpecial(k, 1)}
										disabled={working.special[k] >= max ||
											(specialRemaining <= 0 && working.special[k] >= 5)}>+</button
									>
								</div>
							</div>
							<details class="mt-2 text-xs">
								<summary class="cursor-pointer opacity-70">[ ? ] What does {meta.short} do?</summary>
								<div class="mt-1 space-y-1 opacity-90">
									<ul class="list-inside list-['»'] pl-2">
										{#each meta.uses as u (u)}
											<li>{u}</li>
										{/each}
									</ul>
									<p class="pip-glow-amber mt-1 text-xs">{meta.feel}</p>
									<p class="opacity-60">Max for this origin: {max}</p>
								</div>
							</details>
						</div>
					{/each}
				</div>
			</div>
		{:else if step === 3}
			<div class="space-y-4">
				{#if working.originKey === 'survivor'}
					<div>
						<div class="text-xs opacity-70">SURVIVOR TRAITS — pick exactly 2</div>
						<div class="mt-2 grid gap-2 sm:grid-cols-2">
							{#each SURVIVOR_TRAITS as t (t.key)}
								{@const picked = working.traits.includes(t.key)}
								<button
									type="button"
									class="border p-2 text-left text-xs transition {picked
										? 'border-[var(--color-pip-green)] bg-[rgba(21,255,96,0.08)]'
										: 'border-[var(--color-pip-green-dim)] hover:border-[var(--color-pip-green)]'}"
									onclick={() => toggleSurvivorTrait(t.key)}
								>
									<div class="pip-glow text-base">{t.name}</div>
									<div class="opacity-80">+ {t.benefit}</div>
									<div class="opacity-60">- {t.penalty}</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<details class="border border-[var(--color-pip-green-dim)] p-3 text-xs">
					<summary class="cursor-pointer text-sm">[ ? ] How do skills work?</summary>
					<div class="mt-2 space-y-2 opacity-90">
						<p>
							Each skill pairs with an attribute. Your <span class="pip-glow">target number</span>
							for a roll = attribute + skill rank. Roll 2d20, every die ≤ TN scores 1 success. The GM sets
							a difficulty (1–5 successes); excess successes become Action Points.
						</p>
						<p>
							A natural <span class="pip-glow">1</span> is a critical (2 successes); a natural
							<span class="pip-glow-amber">20</span> is a complication.
						</p>
						<p>
							<span class="pip-glow-amber">★ Tag Skills</span> are your specialties. On a Tag skill, ANY die
							rolling ≤ skill rank also crits — so a Sneak 3 / TN 12 character on Tag rolls crits on 1, 2,
							OR 3, not just 1. Tag Skills are the most powerful lever in the system.
						</p>
						<p class="opacity-70">
							Skill cap at character creation = 3. After play starts, max rank = 6. Every level gives +1
							skill rank to spend.
						</p>
					</div>
				</details>

				<div>
					<div class="text-xs opacity-70">
						TAG SKILLS — pick {totalTagAllowed} (each starts at rank 2, click skill name to toggle)
						{#if working.originKey === 'ghoul'}<span class="opacity-60"
								>· Ghoul auto-tag: Survival</span
							>{/if}
						{#if origin.extraTagSkillFrom}<span class="opacity-60"
								>· Brotherhood +1 from {origin.extraTagSkillFrom
									.map((k) => SKILL_LABELS[k])
									.join(', ')}</span
							>{/if}
					</div>
					<div class="mt-2 text-xs">
						selected: <span class="pip-glow">{working.tagSkills.length}</span> / {totalTagAllowed}
					</div>
				</div>

				<div>
					<div class="text-xs opacity-70">
						SKILL POINTS — <span class="pip-glow">{skillRemaining}</span> / {skillBudget} remaining
						(budget = 9 + INT, cap rank {skillRankCap} at level 1)
					</div>
					<div class="mt-2 grid gap-2 sm:grid-cols-2">
						{#each SKILL_KEYS as k (k)}
							{@const isTag = working.tagSkills.includes(k)}
							{@const tagBase = isTag ? 2 : 0}
							{@const attr = SKILL_DEFAULT_ATTR[k]}
							{@const tn = working.special[attr] + working.skills[k]}
							<div
								class="border p-2 text-xs {isTag
									? 'border-[var(--color-pip-amber)] bg-[rgba(255,176,0,0.05)]'
									: 'border-[var(--color-pip-green-dim)]'}"
							>
								<div class="flex items-center justify-between gap-2">
									<button
										type="button"
										onclick={() => toggleTag(k)}
										class="flex-1 text-left"
										title="Click to toggle Tag"
									>
										<div class="pip-display text-base {isTag ? 'pip-glow-amber' : 'pip-glow'}">
											{isTag ? '★' : '☐'} {SKILL_LABELS[k]}
										</div>
										<div class="opacity-60">
											{SPECIAL_LABELS[attr].short} · TN {tn}
										</div>
									</button>
									<div class="flex items-center gap-1">
										<button
											class="pip-btn px-2 py-0"
											onclick={() => bumpSkill(k, -1)}
											disabled={working.skills[k] <= tagBase}>-</button
										>
										<span class="w-6 text-center">{working.skills[k]}</span>
										<button
											class="pip-btn px-2 py-0"
											onclick={() => bumpSkill(k, 1)}
											disabled={working.skills[k] >= skillRankCap || skillRemaining <= 0}>+</button
										>
									</div>
								</div>
								<div class="mt-1 text-[0.7rem] opacity-70">{SKILL_DESCRIPTIONS[k]}</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else if step === 4}
			<div class="space-y-3">
				<details class="border border-[var(--color-pip-green-dim)] p-3 text-xs">
					<summary class="cursor-pointer text-sm">[ ? ] What are perks?</summary>
					<div class="mt-2 space-y-2 opacity-90">
						<p>
							Perks are your character's edges — re-rolls, bonus damage, special abilities, crafting
							access, "smite"-like burst options. Each level grants 1 perk pick (most have 1–4 ranks).
						</p>
						<p>
							Each perk has requirements: usually a minimum SPECIAL attribute, sometimes a level or
							another perk rank. We show <span class="pip-glow">all 45+ core perks</span> below — the
							ones you can pick now are highlighted, the rest are grayed out with the exact gap (e.g.
							"Needs LCK 8/9").
						</p>
						<p class="opacity-70">
							Tip: see what's gated and consider whether to bend a SPECIAL pick to unlock a key
							perk. Better Criticals (Smite for ranged) needs LCK 9; Slayer (Smite for melee) needs STR 8.
						</p>
					</div>
				</details>

				<div class="text-sm">
					&gt; Pick your first perk. Currently chosen: <span class="pip-glow"
						>{chosenPerkKey ? PERKS_BY_KEY[chosenPerkKey].name : '— none —'}</span
					>
				</div>

				<div class="flex flex-wrap items-center gap-2 text-xs">
					<span class="opacity-70">FILTER:</span>
					<button
						class="pip-btn px-2 py-0 text-xs {perkFilter === 'all'
							? 'bg-[var(--color-pip-green-dim)] text-[#001500]'
							: ''}"
						onclick={() => (perkFilter = 'all')}>All</button
					>
					{#each PERK_CATEGORIES as cat (cat)}
						<button
							class="pip-btn px-2 py-0 text-xs {perkFilter === cat
								? 'bg-[var(--color-pip-green-dim)] text-[#001500]'
								: ''}"
							onclick={() => (perkFilter = cat)}>{CATEGORY_LABELS[cat].split(' — ')[0]}</button
						>
					{/each}
					<label class="ml-auto flex items-center gap-1">
						<input type="checkbox" bind:checked={showUnavailable} />
						<span>Show unavailable</span>
					</label>
				</div>

				<div class="grid gap-2">
					{#each visiblePerks as p (p.key)}
						{@const reason = unmetReason(p)}
						{@const ok = reason === null}
						{@const selected = chosenPerkKey === p.key}
						<button
							type="button"
							disabled={!ok}
							class="border p-2 text-left text-xs transition {selected
								? 'border-[var(--color-pip-green)] bg-[rgba(21,255,96,0.08)]'
								: ok
									? 'border-[var(--color-pip-green-dim)] hover:border-[var(--color-pip-green)]'
									: 'border-[var(--color-pip-green-dim)] opacity-40'}"
							onclick={() => ok && (chosenPerkKey = p.key)}
						>
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<div class="pip-display pip-glow text-base">
									{p.name}
									<span class="opacity-60">({p.ranks} rank{p.ranks > 1 ? 's' : ''})</span>
								</div>
								<div class="text-xs">
									{#if !ok}
										<span class="pip-glow-amber">✗ {reason}</span>
									{:else}
										<span class="opacity-60">{CATEGORY_LABELS[p.category].split(' — ')[0]}</span>
									{/if}
								</div>
							</div>
							<div class="mt-1 opacity-80">{p.text}</div>
							{#if p.flavor}
								<div class="mt-1 text-[0.7rem] opacity-60">→ {p.flavor}</div>
							{/if}
						</button>
					{:else}
						<p class="opacity-70 text-xs">[ no perks match this filter ]</p>
					{/each}
				</div>
			</div>
		{:else if step === 5}
			<div class="space-y-4">
				<label class="block">
					<span class="text-xs opacity-70"
						>PERSONAL TRINKET — describe an item that means something to you. Once per quest, gaze at
						it to regain 1 Luck Point.</span
					>
					<input
						class="pip-input mt-1"
						bind:value={working.trinket}
						placeholder="e.g. A pre-war gold pocket watch"
					/>
				</label>
				<label class="block">
					<span class="text-xs opacity-70">STARTING CAPS</span>
					<input class="pip-input mt-1" type="number" min="0" bind:value={working.caps} />
				</label>
				<label class="block">
					<span class="text-xs opacity-70">NOTES</span>
					<textarea
						class="pip-textarea mt-1 min-h-[8rem]"
						bind:value={working.notes}
						placeholder="Backstory, relationships, current goals…"
					></textarea>
				</label>
			</div>
		{:else if step === 6}
			<div class="space-y-3 text-sm">
				<p>&gt; Review and confirm. You can edit everything later.</p>
				<div class="grid gap-2 sm:grid-cols-2">
					<div class="border border-[var(--color-pip-green-dim)] p-3">
						<div class="text-xs opacity-60">NAME / ORIGIN</div>
						<div class="pip-display pip-glow text-lg">{working.name}</div>
						<div>{origin.name}</div>
					</div>
					<div class="border border-[var(--color-pip-green-dim)] p-3">
						<div class="text-xs opacity-60">DERIVED</div>
						<div>HP: <span class="pip-glow">{derived_.maxHp}</span></div>
						<div>Defense: <span class="pip-glow">{derived_.defense}</span></div>
						<div>Initiative: <span class="pip-glow">{derived_.initiative}</span></div>
						<div>Carry: <span class="pip-glow">{derived_.carryWeight} lbs</span></div>
						<div>Melee bonus: <span class="pip-glow">+{derived_.meleeBonusCD} CD</span></div>
						<div>Luck Points: <span class="pip-glow">{derived_.maxLuck}</span></div>
					</div>
				</div>
				<div class="border border-[var(--color-pip-green-dim)] p-3">
					<div class="text-xs opacity-60">SPECIAL (with origin bonuses)</div>
					<div class="mt-1 grid grid-cols-7 gap-2 text-center">
						{#each SPECIAL_KEYS as k (k)}
							{@const finalSpecial = applyOriginToBase(working).special}
							<div>
								<div class="text-xs opacity-70">{SPECIAL_LABELS[k].short}</div>
								<div class="pip-display pip-glow text-xl">{finalSpecial[k]}</div>
							</div>
						{/each}
					</div>
				</div>
				<div class="border border-[var(--color-pip-green-dim)] p-3">
					<div class="text-xs opacity-60">TAG SKILLS</div>
					<div>
						{working.tagSkills.map((k) => SKILL_LABELS[k]).join(' · ') || '(none)'}
					</div>
				</div>
				<div class="border border-[var(--color-pip-green-dim)] p-3">
					<div class="text-xs opacity-60">PERK</div>
					<div>{chosenPerkKey ? PERKS_BY_KEY[chosenPerkKey].name : '(none)'}</div>
				</div>
			</div>
		{/if}

		<div class="mt-6 flex items-center justify-between">
			<button class="pip-btn" onclick={prev} disabled={step === 1}>‹ Back</button>
			{#if step < 6}
				<button class="pip-btn" onclick={next} disabled={!canAdvance()}>Next ›</button>
			{:else}
				<button class="pip-btn pip-glow-amber" onclick={finish}>[ ✓ ] Save Character</button>
			{/if}
		</div>
	</div>
</section>
