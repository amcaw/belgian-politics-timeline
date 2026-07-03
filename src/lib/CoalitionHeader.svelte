<script lang="ts">
	import { base } from '$app/paths';
	import {
		ELECTIONS,
		GOVERNMENTS,
		party,
		totalCoalitionSeats,
		yearsInPower,
		govTermEnd,
		type Government
	} from './data';

	// `featured` = government to describe.
	let { featured }: { featured: Government } = $props();

	const chamberTotal = $derived(
		ELECTIONS.find((e) => e.date === featured.electionDate)?.totalSeats ?? 150
	);
	// "(actuel)" only when this really is the most recent government in the data.
	const latest = GOVERNMENTS[GOVERNMENTS.length - 1];
	const isCurrent = $derived(featured.government === latest.government);
	const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

	// largest coalition ever: rendered invisibly behind the real chips so the
	// header always reserves the worst-case height (no layout shift on selection)
	const biggest = GOVERNMENTS.reduce((a, b) => (b.coalition.length > a.coalition.length ? b : a));
</script>

{#snippet chips(gov: Government)}
	{@const asOf = govTermEnd(gov)}
	{#each gov.coalition as c (c.id)}
		{@const p = party(c.id)}
		{@const power = yearsInPower(c.id, asOf)}
		<span class="coal-chip" style:border-color={p.color}
			title="{p.fullName} — {c.seats} sièges · ~{power.years} ans au pouvoir">
			<span class="sw" style:background={p.color}></span>{p.label}
			<b>{c.seats}</b>
			<span class="chip-power">~{power.years} ans au pouvoir</span>
		</span>
	{/each}
{/snippet}

<div class="coal-header">
	<div class="coal-pm">
		{#if featured.photo}<img src={base + featured.photo} alt={featured.name} />{/if}
		<div>
			<div class="coal-pm-name">{featured.name}</div>
			<div class="coal-pm-sub">
				Gouvernement {featured.government} · depuis le {fmtDate(featured.startDate)}
				{#if isCurrent}<span class="coal-latest">(actuel)</span>{/if}
			</div>
		</div>
	</div>
	<div class="coal-mid">
		<div class="coal-sub">Coalition · {totalCoalitionSeats(featured)} sièges sur {chamberTotal}</div>
		<div class="coal-chips-stack">
			<div class="coal-chips ghost" aria-hidden="true">{@render chips(biggest)}</div>
			<div class="coal-chips">{@render chips(featured)}</div>
		</div>
		<div class="coal-foot">
			L'ancienneté cumule les années au gouvernement de toute la famille — ailes
			linguistiques et changements de nom inclus (ex.&nbsp;PSC → cdH → Les Engagés),
			jusqu'à ce gouvernement.
		</div>
	</div>
	<a class="wiki-link" href={featured.wikiUrl} target="_blank" rel="noreferrer">Wikipédia ↗</a>
</div>

<style>
	.coal-header {
		display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap;
		background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
		padding: 12px 16px; margin-bottom: 0.8rem;
	}
	.coal-pm { display: flex; align-items: center; gap: 10px; }
	.coal-pm img { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
	.coal-pm-name { font-weight: 800; font-size: 1rem; color: var(--text); }
	.coal-pm-sub { font-size: 0.76rem; color: var(--text-muted); }
	.coal-latest { color: var(--accent); font-weight: 700; }
	.coal-mid { flex: 1; min-width: 200px; }
	.coal-sub { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em;
		color: var(--text-muted); font-weight: 700; margin-bottom: 0.3rem; }
	/* the invisible ghost (largest coalition ever) sits behind the real chips in
	   the same grid cell, so the container always has the worst-case height at
	   the current viewport width → no layout shift when the selection changes */
	.coal-chips-stack { display: grid; }
	.coal-chips-stack > .coal-chips { grid-area: 1 / 1; }
	.ghost { visibility: hidden; pointer-events: none; }
	.coal-chips { display: flex; flex-wrap: wrap; gap: 5px; align-content: flex-start; }
	.coal-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem;
		font-weight: 600; color: var(--text); border: 1.5px solid; border-radius: 999px;
		padding: 3px 9px; background: var(--surface-2); white-space: nowrap; }
	.coal-chip b { color: var(--text); font-variant-numeric: tabular-nums; }
	.coal-chip .sw { width: 10px; height: 10px; border-radius: 2px; }
	.chip-power { color: var(--text-muted); font-weight: 500; font-size: 0.68rem;
		border-left: 1px solid var(--border); padding-left: 6px; margin-left: 1px; }
	.coal-foot { font-size: 0.68rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic; }
	.wiki-link { background: var(--accent); color: var(--accent-contrast); font-size: 0.8rem;
		font-weight: 700; text-decoration: none; padding: 9px 14px; border-radius: 9px;
		white-space: nowrap; transition: opacity 0.15s; }
	.wiki-link:hover { opacity: 0.88; }
</style>
