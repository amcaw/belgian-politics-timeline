<script lang="ts">
	import Timeline from '$lib/Timeline.svelte';
	import GovernanceGantt from '$lib/GovernanceGantt.svelte';
	import Legend from '$lib/Legend.svelte';
	import Methodology from '$lib/Methodology.svelte';
	import { METRIC_LABELS, type Metric } from '$lib/data';

	let metric = $state<Metric>('votes');
	let view = $state<'results' | 'power' | 'powerStream'>('power');

	const metrics: Metric[] = ['seats', 'votes'];
</script>

<svelte:head>
	<title>Belgian federal political parties · 1946–2024</title>
</svelte:head>

<main>
	<header>
		<h1>Qui gouverne la Belgique&nbsp;?</h1>
		<p class="subtitle">
			Les partis à la Chambre des représentants, 1946 → 2024 ·
			<span class="hint-inline">cliquez un Premier ministre pour sa coalition</span>
		</p>
	</header>

	<div class="controls">
		<div class="toggle-group">
			<span class="toggle-label">Vue&nbsp;:</span>
			<button class:active={view === 'results'} onclick={() => (view = 'results')}>Résultats</button>
			<button class:active={view === 'power'} onclick={() => (view = 'power')}>Au pouvoir</button>
			<button class:active={view === 'powerStream'} onclick={() => (view = 'powerStream')}>Au pouvoir (flux)</button>
		</div>

		{#if view !== 'power'}
			<div class="toggle-group">
				<span class="toggle-label">Mesure&nbsp;:</span>
				{#each metrics as m}
					<button class:active={metric === m} onclick={() => (metric = m)}>
						{METRIC_LABELS[m]}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if view === 'power'}
		<GovernanceGantt />
	{:else}
		<Timeline {metric} powerMode={view === 'powerStream'} />
	{/if}

	<Legend />

	<Methodology />

	<footer>
		<p>
			Sources&nbsp;: résultats officiels
			<a href="https://resultatselection.belgium.be/" target="_blank" rel="noreferrer"
				>IBZ&nbsp;/&nbsp;electionresults.belgium.be</a
			>, recoupés avec Wikipédia&nbsp;; couleurs et filiation des partis d'après le
			<em>Timeline of Belgian political parties</em> (CRISP). Voir le détail du traitement
			des données ci-dessus.
		</p>
	</footer>
</main>

<style>
	main {
		max-width: 1500px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}
	header h1 {
		font-size: 1.9rem;
		font-weight: 800;
		margin: 0 0 0.25rem;
		letter-spacing: -0.01em;
		color: var(--text);
	}
	.subtitle {
		margin: 0 0 1.5rem;
		color: var(--text-secondary);
		font-size: 0.95rem;
		font-weight: 500;
	}
	.hint-inline { color: var(--accent); font-weight: 600; }
	.controls {
		display: flex;
		gap: 1rem 1.5rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}
	/* segmented control / tab-bar (design system §5) */
	.toggle-group {
		display: flex;
		align-items: center;
		gap: 2px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 3px;
	}
	.toggle-label {
		font-size: 0.72rem;
		color: var(--text-muted);
		font-weight: 600;
		padding: 0 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.toggle-group button {
		border: none;
		background: transparent;
		padding: 8px 16px;
		border-radius: 9px;
		font: 600 0.78rem var(--font);
		cursor: pointer;
		color: var(--text-secondary);
		transition: all 0.15s;
		white-space: nowrap;
	}
	.toggle-group button:hover {
		color: var(--text);
	}
	.toggle-group button.active {
		background: var(--accent);
		color: var(--accent-contrast);
	}
	footer {
		margin-top: 2rem;
		font-size: 0.72rem;
		color: var(--text-muted);
		line-height: 1.5;
	}
	footer a {
		color: var(--text-secondary);
	}
</style>
