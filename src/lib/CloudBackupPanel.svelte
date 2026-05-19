<script lang="ts">
	import {
		cloudConfigured,
		CloudConflictError,
		CloudUnconfiguredError,
		disableSync,
		enableSync,
		recoveryUrl
	} from '$lib/cloud';
	import { saveCharacter } from '$lib/db';
	import { characters, cloudSync } from '$lib/store.svelte';
	import type { Character } from '$lib/fallout/types';

	interface Props {
		character: Character;
	}

	let { character }: Props = $props();

	let status = $state<'idle' | 'enabling' | 'disabling'>('idle');
	let error = $state<string>('');
	let copied = $state(false);

	let token = $derived(character.cloudToken);
	let url = $derived(token ? recoveryUrl(token) : '');
	let sync = $derived(cloudSync.get(character.id));

	async function enable() {
		if (!cloudConfigured()) {
			error =
				'Cloud sync is not configured for this build. The deployed site has it enabled — local dev does not.';
			return;
		}
		status = 'enabling';
		error = '';
		try {
			const updated = await enableSync(character);
			// Mutate in place so the parent's $state reactivity picks up the new token.
			character.cloudToken = updated.cloudToken;
			character.cloudSyncedAt = updated.cloudSyncedAt;
			// Persist the change locally too.
			await saveCharacter(JSON.parse(JSON.stringify(character)) as Character);
			await characters.refresh();
		} catch (e) {
			if (e instanceof CloudUnconfiguredError) {
				error = 'Cloud sync is not configured for this build.';
			} else if (e instanceof CloudConflictError) {
				error = 'Unexpected conflict while enabling — try again.';
			} else {
				error = e instanceof Error ? e.message : 'enable_failed';
			}
		} finally {
			status = 'idle';
		}
	}

	async function disable() {
		if (!character.cloudToken) return;
		const ok = confirm(
			'Disable cloud backup?\n\nThis deletes the cloud copy. The character stays on this device, but anyone holding the recovery link will lose access. You cannot undo this — if you re-enable backup later, a new link is generated.'
		);
		if (!ok) return;
		status = 'disabling';
		error = '';
		try {
			const updated = await disableSync(character);
			character.cloudToken = updated.cloudToken;
			character.cloudSyncedAt = updated.cloudSyncedAt;
			await saveCharacter(JSON.parse(JSON.stringify(character)) as Character);
			await characters.refresh();
			cloudSync.clear(character.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'disable_failed';
		} finally {
			status = 'idle';
		}
	}

	async function copy() {
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// fall back to a select-and-prompt-the-user approach if clipboard denied
			window.prompt('Copy this recovery link:', url);
		}
	}
</script>

<section class="pip-panel" data-testid="cloud-backup-panel">
	<div class="pip-panel-header flex items-center justify-between">
		<span>CLOUD BACKUP</span>
		{#if token}
			{#if sync.kind === 'syncing'}
				<span class="text-xs opacity-70">[ syncing… ]</span>
			{:else if sync.kind === 'synced'}
				<span class="text-xs opacity-70">[ ✓ synced ]</span>
			{:else if sync.kind === 'conflict'}
				<span class="text-xs text-red-300">[ ! newer copy on server ]</span>
			{:else if sync.kind === 'error'}
				<span class="text-xs text-red-300">[ ! sync error ]</span>
			{:else}
				<span class="text-xs opacity-70">[ on ]</span>
			{/if}
		{:else}
			<span class="text-xs opacity-70">[ off ]</span>
		{/if}
	</div>

	<div class="space-y-3 p-4 sm:p-6">
		{#if !token}
			<p class="text-xs opacity-80">
				Save this character to the cloud so it survives browser wipes, incognito sessions,
				and switching devices. You'll get a recovery link — anyone with that link can read
				and edit this character, so treat it like a password.
			</p>
			<button
				class="pip-btn"
				data-testid="cloud-enable-btn"
				disabled={status === 'enabling'}
				onclick={enable}
			>
				{#if status === 'enabling'}
					[ enabling… ]
				{:else}
					[ + ] Back up to cloud
				{/if}
			</button>
			{#if error}
				<p class="text-xs text-red-300" data-testid="cloud-error">{error}</p>
			{/if}
		{:else}
			<div class="space-y-2">
				<p class="text-xs opacity-80">
					<strong class="text-amber-300">Save this link now.</strong> It's the
					<em>only</em> way to recover this character on another device or after a browser
					wipe — there are no accounts, no passwords, no email recovery. Anyone with the link
					can access this character, so keep it private.
				</p>
				<p class="text-xs opacity-70">
					Recommended: bookmark it, paste it into your password manager, and/or save it as
					a plain text file somewhere safe.
				</p>
			</div>

			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<input
					class="pip-input flex-1 font-mono text-xs"
					data-testid="cloud-recovery-url"
					readonly
					value={url}
					onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
				/>
				<button class="pip-btn" data-testid="cloud-copy-btn" onclick={copy}>
					{#if copied}
						[ ✓ copied ]
					{:else}
						[ copy link ]
					{/if}
				</button>
			</div>

			{#if sync.kind === 'conflict'}
				<p class="text-xs text-red-300" data-testid="cloud-conflict">
					The cloud copy is newer than this device. This usually means you edited the same
					character somewhere else. Open the recovery link in this browser to pull the
					newer copy (it will overwrite local edits).
				</p>
			{:else if sync.kind === 'error'}
				<p class="text-xs text-red-300" data-testid="cloud-error">
					Sync error: {sync.message}. Edits are still saved locally — they'll push next
					time the connection works.
				</p>
			{/if}

			<div class="pt-2">
				<button
					class="pip-btn pip-btn-danger text-xs"
					data-testid="cloud-disable-btn"
					disabled={status === 'disabling'}
					onclick={disable}
				>
					{#if status === 'disabling'}
						[ disabling… ]
					{:else}
						[ X ] Disable cloud backup
					{/if}
				</button>
			</div>
			{#if error}
				<p class="text-xs text-red-300" data-testid="cloud-error">{error}</p>
			{/if}
		{/if}
	</div>
</section>
