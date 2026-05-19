<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cloudConfigured, CloudUnconfiguredError, pull } from '$lib/cloud';
	import { saveCharacter } from '$lib/db';
	import { characters } from '$lib/store.svelte';

	let status = $state<'pending' | 'error'>('pending');
	let errorMessage = $state<string>('');

	$effect(() => {
		if (!browser) return;
		const token = page.params.token;
		if (!token) {
			status = 'error';
			errorMessage = 'Missing recovery token in URL.';
			return;
		}
		if (!cloudConfigured()) {
			status = 'error';
			errorMessage =
				'Cloud sync is not configured for this build. Open the same recovery link on the live site (fallout.matpb.com).';
			return;
		}
		(async () => {
			try {
				const character = await pull(token);
				await saveCharacter(character);
				await characters.refresh();
				await goto(`/character/${character.id}`, { replaceState: true });
			} catch (e) {
				if (e instanceof CloudUnconfiguredError) {
					errorMessage = 'Cloud sync is not configured for this build.';
				} else if (e instanceof Error && e.message.startsWith('cloud_404')) {
					errorMessage =
						"This recovery link doesn't match any character. Double-check the URL — recovery tokens are case-sensitive.";
				} else {
					errorMessage = e instanceof Error ? e.message : 'Recovery failed.';
				}
				status = 'error';
			}
		})();
	});
</script>

<svelte:head>
	<title>Recovering character — Pip-Boy 3000</title>
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-12">
	{#if status === 'pending'}
		<h1 class="font-mono text-2xl text-amber-400">Restoring character…</h1>
		<p class="mt-4 text-amber-200/80">
			Pulling from the cloud and stashing it on this device.
		</p>
	{:else}
		<h1 class="font-mono text-2xl text-red-400">Recovery failed</h1>
		<p class="mt-4 text-amber-200/90">{errorMessage}</p>
		<a
			href="/"
			class="mt-6 inline-block rounded border border-amber-500/60 px-4 py-2 font-mono text-amber-200 hover:bg-amber-500/10"
		>
			← Back to roster
		</a>
	{/if}
</div>
