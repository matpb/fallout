<svelte:head>
	<title>Pip-Boy 3000 — About</title>
</svelte:head>

<section class="pip-panel">
	<div class="pip-panel-header">INFO &gt; ABOUT</div>
	<div class="prose prose-invert space-y-4 p-4 text-sm sm:p-6">
		<p>
			<span class="pip-glow">PIP-BOY 3000 MK IV</span> is an unofficial fan tool for managing
			characters in <em>Fallout: The Roleplaying Game</em> by Modiphius Entertainment.
		</p>

		<h2 class="pip-display pip-glow text-xl">How it works</h2>
		<ul class="list-inside list-['»'] space-y-1 pl-2">
			<li>100% offline. No backend, no accounts, no telemetry.</li>
			<li>Characters live in your browser's IndexedDB (via Dexie).</li>
			<li>Install as a PWA from your browser's "Add to Home Screen" menu.</li>
			<li>Backup &amp; restore via JSON export — keep your wasteland safe.</li>
		</ul>

		<h2 class="pip-display pip-glow text-xl">Disclaimer</h2>
		<p class="opacity-80">
			Fallout, S.P.E.C.I.A.L., and related marks belong to Bethesda Softworks LLC. The 2d20 system is
			© Modiphius Entertainment. This tool is a fan-made utility built for personal use; no
			copyrighted text from the rulebook is reproduced here. Refer to the
			<em>Fallout: The Roleplaying Game</em> Core Rulebook for full rules.
		</p>

		<h2 class="pip-display pip-glow text-xl">Source</h2>
		<p>
			Built with SvelteKit + Dexie + Tailwind. Open source on GitHub:
			<a class="pip-glow underline" href="https://github.com/matpb/fallout" target="_blank" rel="noopener"
				>matpb/fallout</a
			>.
		</p>
	</div>
</section>
