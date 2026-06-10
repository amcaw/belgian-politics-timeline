<script lang="ts">
	import { base } from '$app/paths';
	import {
		ELECTIONS,
		GOVERNMENTS,
		party,
		totalCoalitionSeats,
		yearsInPower,
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
</script>

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
		<div class="coal-chips">
			{#each featured.coalition as c (c.id)}
				{@const p = party(c.id)}
				{@const power = yearsInPower(c.id)}
				<span class="coal-chip" style:border-color={p.color}
					title="{p.fullName} — {c.seats} sièges · ~{power.years} ans au pouvoir depuis {power.since}">
					<span class="sw" style:background={p.color}></span>{p.label}
					<b>{c.seats}</b>
					<span class="chip-power">~{power.years} ans au pouvoir</span>
				</span>
			{/each}
		</div>
		<div class="coal-foot">
			L'ancienneté au pouvoir cumule toute la lignée du parti, changements de nom inclus
			(ex.&nbsp;PSC → cdH → Les Engagés).
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
	.coal-chips { display: flex; flex-wrap: wrap; gap: 5px; }
	.coal-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem;
		font-weight: 600; color: var(--text); border: 1.5px solid; border-radius: 999px;
		padding: 3px 9px; background: var(--surface-2); }
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
