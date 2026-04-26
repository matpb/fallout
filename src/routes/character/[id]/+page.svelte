<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { characters } from '$lib/store';
	import { ORIGIN_BY_KEY } from '$lib/fallout/origins';
	import { PERKS_BY_KEY } from '$lib/fallout/perks';
	import { applyOriginToBase, isTagSkill } from '$lib/fallout/factory';
	import { deriveAll, inventoryWeight } from '$lib/fallout/derived';
	import {
		SKILL_KEYS,
		SKILL_LABELS,
		SKILL_DEFAULT_ATTR,
		SPECIAL_KEYS,
		SPECIAL_LABELS,
		type Character
	} from '$lib/fallout/types';
	import { v4 as uuid } from 'uuid';

	let character = $state<Character | null>(null);
	let editingName = $state(false);
	let saving = $state(false);

	$effect(() => {
		const id = page.params.id;
		if (!id) return;
		void characters.state.items;
		const c = characters.get(id);
		if (c) character = structuredClone(c);
	});

	onMount(async () => {
		const id = page.params.id;
		if (!id) return;
		await characters.refresh();
		const c = characters.get(id);
		if (c) character = structuredClone(c);
	});

	let origin = $derived(character ? ORIGIN_BY_KEY[character.originKey] : null);
	let derived_ = $derived(character ? deriveAll(applyOriginToBase(character)) : null);
	let invWeight = $derived(character ? inventoryWeight(character) : 0);
	let invOver = $derived(derived_ && invWeight > derived_.carryWeight);

	async function save() {
		if (!character) return;
		saving = true;
		try {
			await characters.upsert(character);
		} finally {
			saving = false;
		}
	}

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

	function clamp(n: number, lo: number, hi: number): number {
		return Math.max(lo, Math.min(hi, n));
	}
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
			<div class="pip-panel-header flex items-center justify-between">
				<span>STAT &gt; {character.name}</span>
				<span class="text-xs opacity-80"
					>LVL {character.level} · XP {character.xp}</span
				>
			</div>
			<div class="space-y-3 p-4 sm:p-6">
				<div class="flex flex-wrap items-center justify-between gap-2">
					{#if editingName}
						<input
							class="pip-input max-w-xs"
							bind:value={character.name}
							onblur={() => (editingName = false)}
							onkeydown={(e) => e.key === 'Enter' && (editingName = false)}
						/>
					{:else}
						<button
							type="button"
							class="pip-display pip-glow text-3xl"
							onclick={() => (editingName = true)}>{character.name}</button
						>
					{/if}
					<div class="text-sm">
						<span class="opacity-70">Origin:</span> {origin.name}
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4 no-print">
					<label class="text-xs">
						<span class="opacity-70">LEVEL</span>
						<input
							class="pip-input"
							type="number"
							min="1"
							max="100"
							value={character.level}
							onchange={(e) =>
								(character!.level = clamp(parseInt((e.target as HTMLInputElement).value) || 1, 1, 100))}
						/>
					</label>
					<label class="text-xs">
						<span class="opacity-70">XP</span>
						<input class="pip-input" type="number" min="0" bind:value={character.xp} />
					</label>
					<label class="text-xs">
						<span class="opacity-70">HP / {derived_.maxHp}</span>
						<input
							class="pip-input"
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
			</div>
		</section>

		<!-- SPECIAL -->
		<section class="pip-panel">
			<div class="pip-panel-header">S.P.E.C.I.A.L.</div>
			<div class="grid grid-cols-7 gap-2 p-4 text-center sm:p-6">
				{#each SPECIAL_KEYS as k (k)}
					{@const finalVal = applyOriginToBase(character).special[k]}
					<div>
						<div class="text-xs opacity-70">{SPECIAL_LABELS[k].short}</div>
						<div class="pip-display pip-glow text-3xl">{finalVal}</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Derived -->
		<section class="pip-panel">
			<div class="pip-panel-header">DERIVED STATISTICS</div>
			<div class="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3 sm:p-6">
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
						class="pip-input pip-display !pip-glow !text-2xl"
						type="number"
						min="0"
						bind:value={character.caps}
					/>
				</div>
				<div>
					<div class="text-xs opacity-70">TRINKET</div>
					<input class="pip-input" bind:value={character.trinket} />
				</div>
			</div>
		</section>

		<!-- Skills -->
		<section class="pip-panel">
			<div class="pip-panel-header">SKILLS</div>
			<div class="grid grid-cols-1 gap-1 p-4 sm:grid-cols-2 sm:p-6">
				{#each SKILL_KEYS as k (k)}
					{@const tag = isTagSkill(character, k)}
					{@const attr = SKILL_DEFAULT_ATTR[k]}
					{@const tn = applyOriginToBase(character).special[attr] + character.skills[k]}
					<div
						class="flex items-center justify-between border-b border-[var(--color-pip-green-dim)] py-1 text-sm"
					>
						<div class="flex items-center gap-2">
							<span class="w-3 {tag ? 'pip-glow-amber' : 'opacity-30'}">{tag ? '★' : ' '}</span>
							<span>{SKILL_LABELS[k]}</span>
							<span class="text-xs opacity-60">[{SPECIAL_LABELS[attr].short}]</span>
						</div>
						<div class="flex items-center gap-2 font-mono">
							<input
								class="pip-input w-12 text-center"
								type="number"
								min="0"
								max="6"
								value={character.skills[k]}
								onchange={(e) =>
									(character!.skills[k] = clamp(
										parseInt((e.target as HTMLInputElement).value) || 0,
										0,
										6
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
			<div class="pip-panel-header">PERKS &amp; TRAITS</div>
			<div class="space-y-2 p-4 sm:p-6">
				{#if character.traits.length === 0 && character.perks.length === 0}
					<p class="text-sm opacity-70">[ none yet ]</p>
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
						<ul class="space-y-1 text-sm">
							{#each character.perks as p (p.key)}
								{@const def = PERKS_BY_KEY[p.key]}
								<li class="border border-[var(--color-pip-green-dim)] p-2">
									<div class="pip-display pip-glow text-base">
										{def?.name ?? p.key} <span class="opacity-60">(rank {p.rank})</span>
									</div>
									<div class="text-xs opacity-80">{def?.text ?? ''}</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</section>

		<!-- Inventory -->
		<section class="pip-panel">
			<div class="pip-panel-header flex items-center justify-between">
				<span>INVENTORY</span>
				<button class="text-xs underline no-print" onclick={addInventoryItem}>[ + add item ]</button>
			</div>
			<div class="space-y-2 p-4 sm:p-6">
				{#if character.inventory.length === 0}
					<p class="text-sm opacity-70">[ pockets empty ]</p>
				{/if}
				{#each character.inventory as item (item.id)}
					<div class="grid grid-cols-12 gap-1 text-xs">
						<input class="pip-input col-span-5" placeholder="Name" bind:value={item.name} />
						<input
							class="pip-input col-span-1"
							type="number"
							min="1"
							placeholder="Qty"
							bind:value={item.qty}
						/>
						<input
							class="pip-input col-span-1"
							type="number"
							min="0"
							step="0.1"
							placeholder="lbs"
							bind:value={item.weight}
						/>
						<input class="pip-input col-span-4" placeholder="Notes" bind:value={item.notes} />
						<button
							class="pip-btn pip-btn-danger col-span-1 px-1 py-0 text-center no-print"
							onclick={() => removeInventoryItem(item.id)}>X</button
						>
					</div>
				{/each}
			</div>
		</section>

		<!-- Notes -->
		<section class="pip-panel">
			<div class="pip-panel-header">NOTES</div>
			<div class="p-4 sm:p-6">
				<textarea class="pip-textarea min-h-[10rem]" bind:value={character.notes}></textarea>
			</div>
		</section>

		<!-- Actions -->
		<div class="flex flex-wrap gap-2 no-print">
			<button class="pip-btn pip-glow-amber" disabled={saving} onclick={save}>
				{saving ? '[ saving… ]' : '[ ✓ ] Save changes'}
			</button>
			<button class="pip-btn" onclick={() => window.print()}>[ ⎙ ] Print sheet</button>
			<a class="pip-btn" href="/">‹ Back to roster</a>
			<button class="pip-btn pip-btn-danger ml-auto" onclick={remove}>[ X ] Delete</button>
		</div>
	</div>
{/if}
