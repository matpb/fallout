<script lang="ts">
	import { onMount } from 'svelte';
	import { characters, downloadBackup, restoreFromFile, dbStats } from '$lib/store.svelte';

	let stats = $state<{ count: number; sizeKB: number } | null>(null);
	let restoreMode = $state<'merge' | 'replace'>('merge');
	let busy = $state(false);
	let message = $state<string>('');

	onMount(async () => {
		await characters.refresh();
		stats = await dbStats();
	});

	async function handleBackup() {
		busy = true;
		try {
			await downloadBackup();
			message = '> Backup downloaded.';
		} catch (e) {
			message = `> ERROR: ${(e as Error).message}`;
		} finally {
			busy = false;
		}
	}

	async function handleRestoreFile(ev: Event) {
		const target = ev.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		busy = true;
		try {
			await restoreFromFile(file, restoreMode);
			stats = await dbStats();
			message = `> Restore complete (${restoreMode}).`;
		} catch (e) {
			message = `> ERROR: ${(e as Error).message}`;
		} finally {
			busy = false;
			target.value = '';
		}
	}

	async function clearAll() {
		if (
			!confirm(
				'This will delete ALL characters from this device. Backup first if you want to keep them. Continue?'
			)
		)
			return;
		busy = true;
		try {
			const { db } = await import('$lib/db');
			await db.characters.clear();
			await characters.refresh();
			stats = await dbStats();
			message = '> All characters deleted.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Pip-Boy 3000 — Data</title>
</svelte:head>

<div class="space-y-6">
	<section class="pip-panel">
		<div class="pip-panel-header">DATA &gt; STORAGE</div>
		<div class="space-y-2 p-4 text-sm sm:p-6">
			{#if stats}
				<p>&gt; <span class="pip-glow">{stats.count}</span> characters in local database</p>
				<p>&gt; Database size: <span class="pip-glow">{stats.sizeKB} KB</span></p>
			{:else}
				<p class="opacity-70">[ scanning… ]</p>
			{/if}
			<p class="opacity-70">&gt; All data lives in your browser's IndexedDB. Nothing is uploaded.</p>
		</div>
	</section>

	<section class="pip-panel">
		<div class="pip-panel-header">DATA &gt; BACKUP</div>
		<div class="space-y-3 p-4 text-sm sm:p-6">
			<p>Export all characters as a single JSON file. Save it somewhere safe.</p>
			<button class="pip-btn" disabled={busy} onclick={handleBackup}>
				[ ↓ ] Download backup
			</button>
		</div>
	</section>

	<section class="pip-panel">
		<div class="pip-panel-header">DATA &gt; RESTORE</div>
		<div class="space-y-3 p-4 text-sm sm:p-6">
			<p>Load a backup file. Choose merge to keep existing characters, replace to wipe and replace.</p>
			<div class="flex flex-wrap gap-3">
				<label class="flex items-center gap-2">
					<input type="radio" bind:group={restoreMode} value="merge" />
					<span>Merge</span>
				</label>
				<label class="flex items-center gap-2">
					<input type="radio" bind:group={restoreMode} value="replace" />
					<span>Replace all</span>
				</label>
			</div>
			<label class="pip-btn cursor-pointer">
				[ ↑ ] Choose backup file
				<input
					type="file"
					accept="application/json,.json"
					class="hidden"
					disabled={busy}
					onchange={handleRestoreFile}
				/>
			</label>
		</div>
	</section>

	<section class="pip-panel">
		<div class="pip-panel-header" style="background: var(--color-pip-red); color: #1a0006;">
			DANGER &gt; WIPE
		</div>
		<div class="space-y-3 p-4 text-sm sm:p-6">
			<p class="opacity-80">Delete all characters from this device. This cannot be undone.</p>
			<button class="pip-btn pip-btn-danger" disabled={busy} onclick={clearAll}>
				[ X ] Wipe all characters
			</button>
		</div>
	</section>

	{#if message}
		<div class="pip-panel">
			<div class="p-3 text-sm">{message}</div>
		</div>
	{/if}
</div>
