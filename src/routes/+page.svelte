<script lang="ts">
	import { base } from '$app/paths';
	import Timeline from '$lib/Timeline.svelte';
	import GovernanceGantt from '$lib/GovernanceGantt.svelte';
	import LineChart from '$lib/LineChart.svelte';
	import Legend from '$lib/Legend.svelte';
	import Methodology from '$lib/Methodology.svelte';
	import {
		METRIC_LABELS,
		ELECTIONS,
		GOVERNMENTS,
		yearsInPower,
		type Metric
	} from '$lib/data';

	let metric = $state<Metric>('votes');
	let view = $state<'results' | 'power' | 'powerStream' | 'lines'>('power');

	const metrics: Metric[] = ['seats', 'votes'];

	// big-number stats (computed from the verified datasets)
	const cd = yearsInPower('cdv'); // christian-democrat lineage (CVP/PSC → CD&V…)
	const stats = [
		{ n: String(ELECTIONS.length), label: 'élections', sub: '1946 → 2024' },
		{ n: String(GOVERNMENTS.length), label: 'gouvernements', sub: 'Van Acker II → De Wever' },
		{ n: String(cd.years), label: 'ans au pouvoir', sub: 'famille chrétienne-démocrate' },
		{ n: '541', label: 'jours sans gouvernement', sub: 'record mondial, 2010-2011' }
	];
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

		<div class="stats">
			{#each stats as s (s.label)}
				<div class="stat">
					<span class="stat-n">{s.n}</span>
					<span class="stat-label">{s.label}</span>
					<span class="stat-sub">{s.sub}</span>
				</div>
			{/each}
			<a class="stat stat-cta" href="{base}/share">
				<span class="stat-n">↗</span>
				<span class="stat-label">version affiche</span>
				<span class="stat-sub">à partager</span>
			</a>
		</div>
	</header>

	<div class="controls">
		<div class="toggle-group">
			<span class="toggle-label">Vue&nbsp;:</span>
			<button class:active={view === 'results'} onclick={() => (view = 'results')}>Résultats</button>
			<button class:active={view === 'power'} onclick={() => (view = 'power')}>Au pouvoir</button>
			<button class:active={view === 'powerStream'} onclick={() => (view = 'powerStream')}>Au pouvoir (flux)</button>
			<button class:active={view === 'lines'} onclick={() => (view = 'lines')}>Blocs</button>
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
	{:else if view === 'lines'}
		<LineChart {metric} />
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
			<em>Timeline of Belgian political parties</em> (Wikimedia Commons). Voir le détail du traitement
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
	/* big-number stats strip */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 10px;
		margin: 0 0 1.5rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 0.7rem 0.9rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
	}
	.stat-n {
		font-size: 1.55rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}
	.stat-label {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}
	.stat-sub { font-size: 0.7rem; color: var(--text-muted); }
	.stat-cta {
		text-decoration: none;
		border-color: var(--accent);
		transition: background 0.15s;
	}
	.stat-cta .stat-n, .stat-cta .stat-label { color: var(--accent); }
	.stat-cta:hover { background: var(--accent-soft); }
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
