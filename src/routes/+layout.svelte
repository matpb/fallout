<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { pwaInfo } from 'virtual:pwa-info';

	let { children } = $props();

	let webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	let now = $state(new Date());
	let timer: ReturnType<typeof setInterval>;

	onMount(() => {
		timer = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(timer);
	});

	const navItems = [
		{ href: '/', label: 'STAT', desc: 'Characters' },
		{ href: '/create', label: 'NEW', desc: 'Create' },
		{ href: '/settings', label: 'DATA', desc: 'Backup' },
		{ href: '/about', label: 'INFO', desc: 'About' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	const padded = (n: number) => n.toString().padStart(2, '0');
</script>

<svelte:head>
	{@html webManifest}
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="border-b-2 border-[var(--color-pip-green-dim)] px-4 py-3 sm:px-6">
		<div class="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3">
			<div>
				<div class="pip-display pip-glow text-3xl leading-none sm:text-4xl">
					PIP-BOY 3000 <span class="text-base opacity-60">MK IV</span>
				</div>
				<div class="text-xs opacity-70">
					ROBCO INDUSTRIES (TM) — UNIFIED OPERATING SYSTEM v2.4.1
				</div>
			</div>
			<div class="text-right text-xs">
				<div class="pip-glow-amber pip-display text-xl leading-none">
					{padded(now.getHours())}:{padded(now.getMinutes())}:{padded(now.getSeconds())}
				</div>
				<div class="opacity-70">
					{now.toLocaleDateString(undefined, {
						weekday: 'short',
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					})}
				</div>
			</div>
		</div>
	</header>

	<nav class="border-b border-[var(--color-pip-green-dim)] px-4 py-2 sm:px-6">
		<div class="mx-auto flex max-w-5xl flex-wrap gap-2">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="pip-btn text-xs sm:text-sm"
					class:bg-[var(--color-pip-green-dim)]={isActive(item.href)}
					class:text-[#001500]={isActive(item.href)}
				>
					<span class="opacity-70">[{item.label}]</span>
					<span>{item.desc}</span>
				</a>
			{/each}
		</div>
	</nav>

	<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
		{@render children()}
	</main>

	<footer
		class="border-t border-[var(--color-pip-green-dim)] px-4 py-2 text-center text-xs opacity-60 sm:px-6"
	>
		PIP-BOY 3000 / Modiphius Fallout RPG — UNOFFICIAL fan tool · Data stays on your device ·
		<a class="underline" href="https://github.com/matpb/fallout" target="_blank" rel="noopener"
			>SOURCE</a
		>
	</footer>
</div>
