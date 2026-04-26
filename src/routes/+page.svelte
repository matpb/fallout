<script lang="ts">
	import { onMount } from 'svelte';
	import { characters } from '$lib/store.svelte';
	import { ORIGIN_BY_KEY } from '$lib/fallout/origins';
	import { deriveAll } from '$lib/fallout/derived';

	onMount(() => characters.refresh());

	function fmtDate(ts: number): string {
		return new Date(ts).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Pip-Boy 3000 — Roster</title>
</svelte:head>

<section class="pip-panel">
	<div class="pip-panel-header flex items-center justify-between">
		<span>STAT &gt; ROSTER</span>
		<span class="text-xs">{characters.state.items.length} ENTRIES</span>
	</div>
	<div class="p-4 sm:p-6">
		{#if !characters.state.loaded}
			<p class="opacity-70">[ LOADING DATABASE… ]</p>
		{:else if characters.state.items.length === 0}
			<div class="space-y-4">
				<p class="opacity-80">
					&gt; No characters in local storage.<br />
					&gt; The Pip-Boy 3000 stores everything on this device. Nothing is sent over the wire.
				</p>
				<a class="pip-btn" href="/create">[ + ] Roll a new character</a>
			</div>
		{:else}
			<ul class="space-y-3">
				{#each characters.state.items as c (c.id)}
					{@const origin = ORIGIN_BY_KEY[c.originKey]}
					{@const d = deriveAll(c)}
					<li>
						<a
							href={`/character/${c.id}`}
							class="block border border-[var(--color-pip-green-dim)] p-3 transition hover:border-[var(--color-pip-green)] hover:bg-[rgba(21,255,96,0.05)]"
						>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div>
									<div class="pip-display pip-glow text-xl">{c.name}</div>
									<div class="text-sm opacity-80">
										LVL {c.level} · {origin.name} · HP {c.currentHp}/{d.maxHp} · LCK {c.currentLuck}/{d.maxLuck}
									</div>
								</div>
								<div class="text-right text-xs opacity-60">
									Updated {fmtDate(c.updatedAt)}
								</div>
							</div>
						</a>
					</li>
				{/each}
			</ul>
			<div class="mt-6">
				<a class="pip-btn" href="/create">[ + ] New Character</a>
			</div>
		{/if}
	</div>
</section>
