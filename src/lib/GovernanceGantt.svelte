<script lang="ts">
	import { base } from '$app/paths';
	import {
		ELECTIONS,
		party,
		GOVERNMENTS,
		govYear,
		coalitionOf,
		coalitionSeats,
		totalCoalitionSeats,
		governingSpells,
		yearsInPower,
		type Government,
		type Spell
	} from './data';

	let {
		selectedGov = $bindable(null)
	}: { selectedGov?: Government | null } = $props();

	const years = ELECTIONS.map((e) => e.year);

	// government in office at (or just after) an election year — for click-to-select
	function govAtElection(date: string): Government | undefined {
		const e = ELECTIONS.find((x) => x.date === date);
		if (!e) return undefined;
		// the government whose electionDate matches, preferring the first one formed
		return GOVERNMENTS.filter((g) => g.electionDate === date).sort(
			(a, b) => govYear(a) - govYear(b)
		)[0];
	}

	// the government featured in the header: explicit selection, else the latest
	const featured = $derived(selectedGov ?? GOVERNMENTS[GOVERNMENTS.length - 1]);

	// ---- layout: one row per party that ever governed ----
	const FAMILY_ORDER = [
		'far-left', 'socialist', 'green', 'regionalist',
		'christian-democrat', 'nationalist', 'liberal', 'far-right', 'other'
	];
	function rank(id: string) {
		const p = party(id);
		const fam = FAMILY_ORDER.indexOf(p.family);
		const wing = p.wing === 'francophone' ? 0 : p.wing === 'national' ? 1 : 2;
		return fam * 10 + wing;
	}

	const spells = governingSpells();
	// parties that ever governed, ordered by family
	const partyIds = [...new Set(spells.map((s) => s.partyId))].sort(
		(a, b) => rank(a) - rank(b) || a.localeCompare(b)
	);

	const rowH = 30;
	const rowGap = 6;
	const perElection = 82;
	const govR = 15;
	const innerW = (years.length - 1) * perElection + perElection; // +1 slot for post-2024 tail
	const innerH = partyIds.length * (rowH + rowGap);

	const lastElecYear = years[years.length - 1];
	const yearMax = 2026.0; // end of the post-2024 tail slot
	const lastElecX = (years.length - 1) * perElection;
	// time axis: even spacing per election; the post-2024 tail occupies one extra slot
	function xAt(yr: number): number {
		if (yr <= years[0]) return 0;
		if (yr >= lastElecYear) {
			const t = Math.min(1, (yr - lastElecYear) / (yearMax - lastElecYear));
			return lastElecX + t * perElection;
		}
		let i = 0;
		while (i < years.length - 1 && years[i + 1] <= yr) i++;
		const t = (yr - years[i]) / (years[i + 1] - years[i]);
		return (i + t) * perElection;
	}
	const rowY = (i: number) => i * (rowH + rowGap);

	// max seats for thickness scaling (from verified coalition compositions)
	const maxSeats = Math.max(
		...GOVERNMENTS.flatMap((g) => g.coalition.map((c) => c.seats)),
		1
	);

	// Build, per spell, the sub-segments that carry a seat count (a spell can span
	// several governments/elections with different seat totals → varying thickness).
	interface Seg { x: number; w: number; h: number; seats: number; gov: string }
	function segmentsOf(s: Spell): Seg[] {
		const govs = GOVERNMENTS.filter((g) => s.governments.includes(g.government)).sort(
			(a, b) => govYear(a) - govYear(b)
		);
		return govs.map((g, i) => {
			const gs = govYear(g);
			const ge =
				i < govs.length - 1
					? govYear(govs[i + 1])
					: GOVERNMENTS[GOVERNMENTS.indexOf(g) + 1]
						? govYear(GOVERNMENTS[GOVERNMENTS.indexOf(g) + 1])
						: yearMax;
			const seats = coalitionSeats(g, s.partyId);
			const h = Math.max(7, (seats / maxSeats) * rowH);
			return { x: xAt(gs), w: Math.max(2, xAt(ge) - xAt(gs)), h, seats, gov: g.government };
		});
	}

	// Portraits stack on multiple rows; within a cluster each higher row is nudged
	// sideways (fan) so its vertical connector segment never runs through the photo
	// below it. Connectors then route at right angles through a gutter under all
	// photos. cx = displayed centre, x = true-date anchor on the axis.
	const minGap = 2 * govR + 4;
	const fanStep = govR * 0.85;
	const govRows = (() => {
		const lastCxByRow: number[] = [];
		const placed = GOVERNMENTS.map((g) => {
			const x = xAt(govYear(g));
			let row = 0;
			while (row < lastCxByRow.length && x + row * fanStep - lastCxByRow[row] < minGap) row++;
			const cx = x + row * fanStep;
			lastCxByRow[row] = cx;
			return { g, x, cx, row };
		});
		return { placed, rowCount: lastCxByRow.length };
	})();
	const govPositions = govRows.placed;
	const pmRowH = 2 * govR + 10; // vertical step between portrait rows
	const pmTop = 14; // top padding before the first portrait row
	const pmBand = pmTop + govRows.rowCount * pmRowH + 16; // dynamic band height
	const margin = { top: pmBand, right: 90, bottom: 30, left: 132 };
	const width = margin.left + innerW + margin.right;
	const height = margin.top + innerH + margin.bottom;

	let hoverParty = $state<string | null>(null);
	let tip = $state<{ x: number; y: number; gov: string; party: string; seats: number } | null>(null);
	function segEnter(s: Spell, seg: Seg, ev: MouseEvent) {
		hoverParty = s.partyId;
		tip = { x: ev.clientX, y: ev.clientY, gov: seg.gov, party: party(s.partyId).label, seats: seg.seats };
	}
	function leave() { hoverParty = null; tip = null; }

	// format an ISO date (YYYY-MM-DD) as JJ/MM/AAAA
	function fmtDate(iso: string): string {
		const [y, m, d] = iso.split('-');
		return `${d}/${m}/${y}`;
	}

	// horizontal-scroll hint (same pattern as the streamgraph)
	let wrapEl = $state<HTMLDivElement | null>(null);
	let canScroll = $state(false);
	let scrolled = $state(0);
	function onScroll() {
		if (!wrapEl) return;
		scrolled = wrapEl.scrollLeft;
		canScroll = wrapEl.scrollWidth - wrapEl.clientWidth > 8;
	}
	$effect(() => { queueMicrotask(onScroll); });
	const showHint = $derived(canScroll && scrolled < 24);
</script>

{#if featured}
	{@const chamberTotal = ELECTIONS.find((e) => e.date === featured.electionDate)?.totalSeats ?? 150}
	<div class="coal-header">
		<div class="coal-pm">
			{#if featured.photo}<img src={base + featured.photo} alt={featured.name} />{/if}
			<div>
				<div class="coal-pm-name">{featured.name}</div>
				<div class="coal-pm-sub">
					Gouvernement {featured.government} · depuis le {fmtDate(featured.startDate)}
					{#if !selectedGov}<span class="coal-latest">(actuel)</span>{/if}
				</div>
			</div>
		</div>
		<div class="coal-mid">
			<div class="coal-sub">
				Coalition · {totalCoalitionSeats(featured)} sièges sur {chamberTotal}
			</div>
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
{/if}

<div class="gantt-col">
	{#if showHint}
		<div class="scroll-hint" aria-hidden="true">
			<span>faites défiler</span>
			<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
		</div>
	{/if}
	<div class="gantt-wrap" bind:this={wrapEl} onscroll={onScroll}>
	<svg viewBox="0 0 {width} {height}" {width} {height} role="img"
		aria-label="Partis au gouvernement fédéral 1946-2024">
		<defs><clipPath id="g-photo"><circle cx="0" cy="0" r={govR} /></clipPath></defs>

		<!-- PM frieze: portraits on multiple rows, each at its TRUE date x.
		     Stems drawn first (behind) so a portrait always sits on top of any line. -->
		<g transform="translate({margin.left},{pmTop})">
			{#each govPositions as gp (gp.g.government + '-stem')}
				{@const cy = (govRows.rowCount - 1 - gp.row) * pmRowH + govR}
				{@const baseY = pmBand - pmTop - 4}
				{@const gutterY = baseY - 8}
				<!-- right-angle connector only: photo ↓ to the gutter (below ALL photos),
				     → horizontally to the true date, ↓ to the axis. Never crosses a photo. -->
				<path class="pm-stem"
					d="M{gp.cx},{cy + govR + 2} V{gutterY} H{gp.x} V{baseY}" />
				<circle class="pm-dot" cx={gp.x} cy={baseY} r="2" fill={party(gp.g.partyId).color} />
			{/each}
			{#each govPositions as gp (gp.g.government)}
				{@const selected = selectedGov?.government === gp.g.government}
				{@const cy = (govRows.rowCount - 1 - gp.row) * pmRowH + govR}
				<g transform="translate({gp.cx},{cy})" role="button" tabindex="0" class="pm-hit"
					aria-label="Gouvernement {gp.g.government} ({gp.g.startDate.slice(0, 4)})"
					onclick={() => (selectedGov = selected ? null : gp.g)}
					onkeydown={(e) => { if (e.key === 'Enter') selectedGov = selected ? null : gp.g; }}>
					<g class="pm" class:pm-selected={selected}>
						<circle r={govR + 1.5} class="pm-ring" stroke={party(gp.g.partyId).color} />
						{#if gp.g.photo}
							<image href={base + gp.g.photo} x={-govR} y={-govR} width={govR * 2} height={govR * 2}
								clip-path="url(#g-photo)" preserveAspectRatio="xMidYMid slice" />
						{/if}
					</g>
				</g>
			{/each}
		</g>

		<g transform="translate({margin.left},{margin.top})">
			<!-- election gridlines; year labels ABOVE the chart to avoid overlap -->
			{#each ELECTIONS as e, i}
				<line class="grid" x1={i * perElection} x2={i * perElection} y1={-6} y2={innerH + 6} />
				<text class="year clickable" x={i * perElection} y={-12}
					role="button" tabindex="0"
					onclick={() => { const g = govAtElection(e.date); if (g) selectedGov = g; }}
					onkeydown={(ev) => { if (ev.key === 'Enter') { const g = govAtElection(e.date); if (g) selectedGov = g; } }}
				>{e.year}</text>
			{/each}

			<!-- vertical cursor at selected government -->
			{#if selectedGov}
				<line class="cursor" x1={xAt(govYear(selectedGov))} x2={xAt(govYear(selectedGov))}
					y1={-26} y2={innerH + 6} />
			{/if}

			<!-- one row per party -->
			{#each partyIds as id, i (id)}
				{@const p = party(id)}
				{@const y = rowY(i)}
				{@const rowDim = hoverParty && hoverParty !== id}
				<text class="row-label" x={-12} y={y + rowH / 2} class:dim={rowDim}>{p.label}</text>
				<line class="row-base" x1={0} x2={innerW} y1={y + rowH / 2} y2={y + rowH / 2} />
				{#each spells.filter((s) => s.partyId === id) as s (s.start)}
					{#each segmentsOf(s) as seg (seg.gov)}
						{@const isSelGovSeg = selectedGov && seg.gov === selectedGov.government}
						<rect
							class="bar"
							class:dim={rowDim || (selectedGov && !coalitionOf(selectedGov).includes(id))}
							class:sel={isSelGovSeg}
							x={seg.x}
							y={y + (rowH - seg.h) / 2}
							width={seg.w - 1}
							height={seg.h}
							rx="3"
							fill={p.color}
							role="presentation"
							onmousemove={(ev) => segEnter(s, seg, ev)}
							onmouseleave={leave}
						/>
					{/each}
				{/each}
			{/each}
		</g>
	</svg>
	</div>

	{#if tip}
		<div class="tooltip" style:left="{tip.x + 14}px" style:top="{tip.y + 14}px">
			<strong>{tip.party}</strong> · {tip.seats} sièges<br />
			<span class="tt-sub">Gouvernement {tip.gov}</span>
		</div>
	{/if}
</div>

<style>
	.gantt-col { position: relative; }
	.gantt-wrap { position: relative; overflow-x: auto; border-radius: 14px;
		border: 1px solid var(--border); background: var(--chart-bg); }
	svg { display: block; }
	.scroll-hint {
		position: absolute; top: 50%; right: 14px; z-index: 5; pointer-events: none;
		display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px;
		border-radius: 999px; background: var(--surface); border: 1px solid var(--border-strong);
		color: var(--text); font-size: 0.74rem; font-weight: 600;
		box-shadow: 0 4px 14px rgba(0,0,0,.25); animation: nudge 1.4s ease-in-out infinite;
	}
	.scroll-hint svg { color: var(--accent); }
	@keyframes nudge { 0%,100% { transform: translate(0,-50%); } 50% { transform: translate(6px,-50%); } }
	@media (prefers-reduced-motion: reduce) { .scroll-hint { animation: none; transform: translateY(-50%); } }
	.grid { stroke: var(--chart-grid); stroke-width: 1; }
	.year { fill: var(--text-muted); font-size: 10px; font-weight: 600; text-anchor: middle;
		font-family: var(--font-mono); }
	.year.clickable { cursor: pointer; }
	.year.clickable:hover { fill: var(--accent); }
	.pm-stem { fill: none; stroke: var(--border-strong); stroke-width: 1; }
	.pm-dot { opacity: 0.9; }
	.cursor { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 3 3; }
	.row-label { fill: var(--text-secondary); font-size: 12px; font-weight: 600;
		text-anchor: end; dominant-baseline: middle; transition: opacity 0.15s; }
	.row-label.dim { opacity: 0.3; }
	.row-base { stroke: var(--divider); stroke-width: 1; }
	.bar { cursor: pointer; transition: opacity 0.15s; stroke: var(--chart-bg); stroke-width: 0.5; }
	.bar:hover { filter: brightness(1.1); }
	.bar.dim { opacity: 0.15; }
	.bar.sel { stroke: var(--text); stroke-width: 1.5; }
	.pm-hit { cursor: pointer; outline: none; }
	.pm-ring { fill: var(--surface); stroke-width: 2; }
	.pm-selected .pm-ring { stroke-width: 4; filter: drop-shadow(0 0 4px var(--accent-shadow)); }
	.tooltip { position: fixed; pointer-events: none; background: var(--surface); color: var(--text);
		border: 1px solid var(--border); padding: 7px 10px; border-radius: 8px; font-size: 12px;
		box-shadow: 0 6px 20px rgba(0,0,0,.3); z-index: 10; }
	.tt-sub { color: var(--text-muted); }

	/* coalition header */
	.coal-header {
		display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap;
		background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
		padding: 12px 16px; margin-bottom: 0.8rem;
	}
	.coal-pm { display: flex; align-items: center; gap: 10px; }
	.coal-pm img { width: 46px; height: 46px; border-radius: 50%; object-fit: cover;
		border: 2px solid var(--border); }
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
