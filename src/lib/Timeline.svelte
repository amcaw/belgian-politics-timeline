<script lang="ts">
	import * as d3 from 'd3';
	import { base } from '$app/paths';
	import { ELECTIONS, share, party, isGoverning, pmAt, type Metric } from './data';

	let {
		metric = 'seats',
		governingOnly = false
	}: { metric?: Metric; governingOnly?: boolean } = $props();

	// ---- horizontal streamgraph (chart_1 style) ----
	// time flows left -> right; each party is a flowing band whose vertical
	// thickness = its seat (or vote) share; bands ordered by political family so
	// related colours sit together and braid through time.

	const years = ELECTIONS.map((e) => e.year);

	// Wide canvas: give each election generous room and let the container scroll
	// horizontally. Bigger = more readable bands + a "grand frieze" feel.
	const perElection = 82;
	const pmBand = 70; // space at top for prime-minister portraits
	const margin = { top: 38 + pmBand, right: 150, bottom: 16, left: 56 };
	const innerW = (years.length - 1) * perElection;
	const width = margin.left + innerW + margin.right;
	const height = 660 + pmBand;
	const innerH = height - margin.top - margin.bottom;
	const photoR = 18; // portrait radius

	// fixed family order (top -> bottom of the stack): left wing at top.
	const FAMILY_ORDER = [
		'far-left',
		'socialist',
		'green',
		'regionalist',
		'christian-democrat',
		'nationalist',
		'liberal',
		'far-right',
		'other'
	];
	function rank(id: string) {
		const p = party(id);
		const fam = FAMILY_ORDER.indexOf(p.family);
		const wing = p.wing === 'francophone' ? 0 : p.wing === 'national' ? 1 : 2;
		return fam * 10 + wing;
	}

	// every party that ever appears, in stable stack order
	const allIds = $derived(
		[...new Set(ELECTIONS.flatMap((e) => e.parties.map((p) => p.id)))]
			.filter((id) => id !== 'other')
			.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
	);

	// share matrix: one row per election, columns per party id
	const series = $derived.by(() => {
		const rows = ELECTIONS.map((e) => {
			const row: Record<string, number> = { year: e.year };
			for (const id of allIds) {
				const p = e.parties.find((q) => q.id === id);
				let s = p ? share(p, metric) : 0;
				if (governingOnly && p && !isGoverning(e.date, id)) s = 0; // collapse non-gov
				row[id] = s;
			}
			return row;
		});
		return rows;
	});

	// x = even spacing PER ELECTION (not linear time), so closely-spaced years
	// like 1977/1978 don't overlap and every election gets equal room.
	const xi = (i: number) => (years.length === 1 ? 0 : (i / (years.length - 1)) * innerW);
	const x = (year: number) => xi(years.indexOf(year));

	const stacked = $derived.by(() => {
		const stack = d3
			.stack<Record<string, number>>()
			.keys(allIds)
			.offset(d3.stackOffsetSilhouette) // centered streamgraph
			.order(d3.stackOrderNone); // keep our family order
		return stack(series);
	});

	// vertical scale: map the stacked extent to innerH
	const yScale = $derived.by(() => {
		const flat = stacked.flat(2).filter((v) => typeof v === 'number') as number[];
		const ext = d3.extent(flat) as [number, number];
		const m = Math.max(Math.abs(ext[0]), Math.abs(ext[1])) || 1;
		return d3.scaleLinear().domain([-m, m]).range([innerH, 0]);
	});

	const area = $derived(
		d3
			.area<d3.SeriesPoint<Record<string, number>>>()
			.x((_, i) => x(years[i]))
			.y0((d) => yScale(d[0]))
			.y1((d) => yScale(d[1]))
			.curve(d3.curveBasis)
	);

	// label anchor: place the label at the election where THIS band is thickest,
	// but only among elections where the party actually has a non-zero share, and
	// require neighbours to be non-trivial too so the label sits on a stable, wide
	// stretch of the band (not on a sliver where it would be misleading).
	function bandWidthAt(s: d3.Series<Record<string, number>, string>, i: number) {
		return Math.abs(yScale(s[i][0]) - yScale(s[i][1]));
	}
	function labelAnchor(s: d3.Series<Record<string, number>, string>) {
		let bi = -1;
		let bw = -1;
		s.forEach((pt, i) => {
			const present = shareAt(years[i], s.key) > 0;
			if (!present) return;
			// stability: average this point's width with its present neighbours
			const wHere = bandWidthAt(s, i);
			const wPrev = i > 0 && shareAt(years[i - 1], s.key) > 0 ? bandWidthAt(s, i - 1) : wHere;
			const wNext = i < s.length - 1 && shareAt(years[i + 1], s.key) > 0 ? bandWidthAt(s, i + 1) : wHere;
			const wAvg = (wHere + wPrev + wNext) / 3;
			if (wAvg > bw) { bw = wAvg; bi = i; }
		});
		if (bi < 0) return { x: 0, y: 0, w: 0, year: years[0], place: false };
		const pt = s[bi];
		return {
			x: x(years[bi]),
			y: (yScale(pt[0]) + yScale(pt[1])) / 2,
			w: bandWidthAt(s, bi), // gate on the actual local width, not the avg
			year: years[bi],
			place: true
		};
	}

	let hovered = $state<string | null>(null);
	let tip = $state<{ x: number; y: number; id: string; year: number } | null>(null);

	// px is in viewBox units (already converted from screen space)
	function nearestYear(vbX: number) {
		const local = vbX - margin.left;
		let bi = 0;
		years.forEach((_, i) => {
			if (Math.abs(xi(i) - local) < Math.abs(xi(bi) - local)) bi = i;
		});
		return years[bi];
	}
	function move(id: string, ev: MouseEvent) {
		const svg = (ev.currentTarget as Element).closest('svg')!;
		const r = svg.getBoundingClientRect();
		// SVG renders at native size; still normalise by rendered width in case the
		// browser scales it, so the year cursor stays accurate.
		const vbX = ((ev.clientX - r.left) / r.width) * width;
		hovered = id;
		// tooltip uses page coords (position: fixed) so it tracks the pointer exactly,
		// flipping near the right/bottom edges so it never goes off-screen.
		const tw = 260, th = 110, pad = 14;
		const flipX = ev.clientX + pad + tw > window.innerWidth;
		const flipY = ev.clientY + pad + th > window.innerHeight;
		tip = {
			x: flipX ? ev.clientX - pad - tw : ev.clientX + pad,
			y: flipY ? ev.clientY - pad - th : ev.clientY + pad,
			id,
			year: nearestYear(vbX)
		};
	}
	function leave() { hovered = null; tip = null; }

	function seatsAt(year: number, id: string) {
		return ELECTIONS.find((e) => e.year === year)?.parties.find((p) => p.id === id)?.seats ?? 0;
	}
	function shareAt(year: number, id: string) {
		const p = ELECTIONS.find((e) => e.year === year)?.parties.find((q) => q.id === id);
		return p ? share(p, metric) : 0;
	}
	function governingAt(year: number, id: string) {
		const e = ELECTIONS.find((x) => x.year === year);
		return e ? isGoverning(e.date, id) : false;
	}
	function textColor(hex: string) {
		const c = d3.rgb(hex);
		return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.62 ? '#1a1a1a' : '#fff';
	}
	const pct = (s: number) => (s * 100).toFixed(1) + '%';

	// map a PM's party abbreviation to a canonical party id (for ring colour)
	const PM_PARTY: Record<string, string> = {
		PSB: 'ps', BSP: 'sp', CVP: 'cvp', PSC: 'psc', 'CD&V': 'cdv', cdH: 'cdh',
		VLD: 'vld', 'Open Vld': 'openvld', MR: 'mr', PS: 'ps', 'N-VA': 'nva'
	};
	const toPartyId = (abbr: string) => PM_PARTY[abbr] ?? 'other';

	// live ranking: the parties at the currently hovered election, biggest first.
	// Driven by hovering a band (tip.year) OR a PM portrait (pmHoverYear).
	// Defaults to the latest election when nothing is hovered.
	let pmHoverYear = $state<number | null>(null);
	const rankYear = $derived(pmHoverYear ?? tip?.year ?? years.at(-1)!);
	const ranking = $derived.by(() => {
		const e = ELECTIONS.find((x) => x.year === rankYear);
		if (!e) return [] as { id: string; v: number; seats: number }[];
		return e.parties
			.filter((p) => p.id !== 'other')
			.map((p) => ({ id: p.id, v: share(p, metric), seats: p.seats }))
			.filter((p) => p.v > 0)
			.sort((a, b) => b.v - a.v)
			.slice(0, 9);
	});
	const rankMax = $derived(Math.max(0.01, ...ranking.map((r) => r.v)));
	const rankPM = $derived(pmAt(ELECTIONS.find((e) => e.year === rankYear)?.date ?? ''));

	// horizontal-scroll hint: show while the chart overflows and isn't scrolled yet
	let wrapEl = $state<HTMLDivElement | null>(null);
	let canScroll = $state(false);
	let scrolled = $state(0);
	function onScroll() {
		if (!wrapEl) return;
		scrolled = wrapEl.scrollLeft;
		canScroll = wrapEl.scrollWidth - wrapEl.clientWidth > 8;
	}
	$effect(() => {
		// re-evaluate when the canvas width could change (metric/governing toggles)
		void width;
		queueMicrotask(onScroll);
	});
	const showHint = $derived(canScroll && scrolled < 24);
</script>

<div class="layout">
	<div class="chart-col">
		{#if showHint}
			<div class="scroll-hint" aria-hidden="true">
				<span>faites défiler</span>
				<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</div>
		{/if}
		<div class="wrap" bind:this={wrapEl} onscroll={onScroll}>
		<svg viewBox="0 0 {width} {height}" {width} {height} role="img"
			aria-label="Frise des partis politiques belges 1946-2024" onmouseleave={leave}>
			<defs>
				{#each stacked as s (s.key)}
					{@const p = party(s.key)}
					<linearGradient id="grad-{s.key}" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color={d3.rgb(p.color).brighter(0.5).formatHex()} />
						<stop offset="100%" stop-color={d3.rgb(p.color).darker(0.5).formatHex()} />
					</linearGradient>
				{/each}
				<clipPath id="photo-clip"><circle cx="0" cy="0" r={photoR} /></clipPath>
			</defs>

			<!-- prime-minister portrait band -->
			<g transform="translate({margin.left},{38})">
				{#each ELECTIONS as e}
					{@const pm = pmAt(e.date)}
					{#if pm}
						{@const active = rankYear === e.year}
						<g transform="translate({x(e.year)},{photoR + 2})"
							role="presentation"
							onmouseenter={() => (pmHoverYear = e.year)}
							onmouseleave={() => (pmHoverYear = null)}>
							<g class="pm" class:pm-active={active}>
								<circle cx="0" cy="0" r={photoR + 1.5} class="pm-ring" stroke={party(toPartyId(pm.party)).color} />
								<image
									href={base + pm.photo}
									x={-photoR} y={-photoR} width={photoR * 2} height={photoR * 2}
									clip-path="url(#photo-clip)" preserveAspectRatio="xMidYMid slice"
								/>
							</g>
						</g>
					{/if}
				{/each}
			</g>

			<g transform="translate({margin.left},{margin.top})">
				<!-- year gridlines + labels -->
				{#each ELECTIONS as e}
					<line class="grid" x1={x(e.year)} x2={x(e.year)} y1={-6} y2={innerH + 6} />
					<text class="year" x={x(e.year)} y={-12} class:year-active={rankYear === e.year}>{e.year}</text>
				{/each}

				<!-- year cursor -->
				{#if tip}
					<line class="cursor" x1={x(tip.year)} x2={x(tip.year)} y1={-22} y2={innerH + 6} />
				{/if}

				<!-- streamgraph bands -->
				{#each stacked as s (s.key)}
					{@const p = party(s.key)}
					<path
						d={area(s)}
						fill="url(#grad-{s.key})"
						class="band"
						class:dim={hovered && hovered !== s.key}
						role="img"
						aria-label={p.fullName}
						onmousemove={(ev) => move(s.key, ev)}
					/>
				{/each}

				<!-- inline labels on thick bands -->
				{#each stacked as s (s.key)}
					{@const p = party(s.key)}
					{@const a = labelAnchor(s)}
					{#if a.place && a.w > 15}
						<text class="band-label" x={a.x} y={a.y} fill={textColor(p.color)}
							class:dim={hovered && hovered !== s.key}>{p.label}</text>
					{/if}
				{/each}
			</g>
		</svg>
		</div>
	</div>

	<!-- live ranking panel -->
	<aside class="rank">
		<div class="rank-year">{rankYear}</div>
		{#if rankPM}
			<div class="rank-pm">
				<img src={base + rankPM.photo} alt={rankPM.name} />
				<div><div class="rank-pm-name">{rankPM.name}</div><div class="rank-pm-role">Premier ministre · {rankPM.party}</div></div>
			</div>
		{/if}
		<div class="rank-bars">
			{#each ranking as r (r.id)}
				{@const p = party(r.id)}
				<div class="rank-row" class:dim={hovered && hovered !== r.id}
					onmouseenter={() => (hovered = r.id)} onmouseleave={() => (hovered = null)} role="presentation">
					<span class="rank-name">{p.label}</span>
					<span class="rank-bar-wrap">
						<span class="rank-bar" style:width="{(r.v / rankMax) * 100}%" style:background={p.color}></span>
					</span>
					<span class="rank-val">{metric === 'seats' ? r.seats : pct(r.v)}</span>
				</div>
			{/each}
		</div>
		<div class="rank-hint">Survolez la frise pour explorer chaque élection</div>
	</aside>

	{#if tip}
		{@const p = party(tip.id)}
		<div class="tooltip" style:left="{tip.x}px" style:top="{tip.y}px">
			<div class="tt-head"><span class="sw" style:background={p.color}></span><strong>{p.fullName}</strong></div>
			<div class="tt-row">{tip.year} · {seatsAt(tip.year, tip.id)} sièges</div>
			<div class="tt-row">{metric === 'seats' ? 'Sièges' : 'Voix'}: <b>{pct(shareAt(tip.year, tip.id))}</b></div>
			{#if governingAt(tip.year, tip.id)}<div class="tt-gov">● au gouvernement</div>{/if}
		</div>
	{/if}
</div>

<style>
	.layout { display: flex; gap: 1rem; align-items: stretch; }
	.chart-col { position: relative; flex: 1; min-width: 0; }
	.wrap {
		position: relative; min-width: 0; overflow-x: auto;
		border-radius: 14px; border: 1px solid var(--border);
		/* layered: faint dot grid over a soft radial glow over the base colour */
		background-color: var(--chart-bg);
		background-image:
			radial-gradient(var(--chart-grid) 0.6px, transparent 0.6px),
			radial-gradient(120% 80% at 50% 18%, var(--chart-bg-glow) 0%, var(--chart-bg) 62%);
		background-size: 22px 22px, 100% 100%;
		background-position: 0 0, 0 0;
	}
	svg { display: block; height: auto; }

	/* horizontal-scroll hint pill, pinned to the visible right edge */
	.scroll-hint {
		position: absolute; top: 50%; right: 14px;
		z-index: 5; pointer-events: none;
		display: inline-flex; align-items: center; gap: 6px;
		padding: 7px 12px; border-radius: 999px;
		background: var(--surface); border: 1px solid var(--border-strong);
		color: var(--text); font-size: 0.74rem; font-weight: 600;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
		animation: nudge 1.4s ease-in-out infinite;
	}
	.scroll-hint svg { color: var(--accent); }
	@keyframes nudge {
		0%, 100% { transform: translate(0, -50%); }
		50% { transform: translate(6px, -50%); }
	}
	@media (prefers-reduced-motion: reduce) { .scroll-hint { animation: none; transform: translateY(-50%); } }

	.grid { stroke: var(--chart-grid); stroke-width: 1; }
	.year {
		fill: var(--text-muted); font-size: 10px; font-weight: 600; text-anchor: middle;
		font-family: var(--font-mono); transition: fill 0.15s;
	}
	.year-active { fill: var(--text); font-weight: 700; }
	.cursor { stroke: var(--chart-cursor); stroke-width: 1.5; stroke-dasharray: 3 3; pointer-events: none; }

	.band { stroke: var(--band-stroke); stroke-width: 0.6; cursor: pointer; transition: opacity 0.15s; }
	.band.dim { opacity: 0.16; }
	.band-label {
		font-size: 12px; font-weight: 700; text-anchor: middle; dominant-baseline: middle;
		pointer-events: none; transition: opacity 0.15s;
		paint-order: stroke; stroke: var(--label-halo); stroke-width: 2.5px;
	}
	.band-label.dim { opacity: 0.12; }

	/* PM portraits — inner group's local origin (0,0) is the portrait centre. */
	.pm { transition: transform 0.15s ease; }
	.pm-ring { fill: var(--surface); stroke-width: 2.5; transition: stroke-width 0.15s; }
	.pm-active { transform: scale(1.16); }
	.pm-active .pm-ring { stroke-width: 3.5; }

	/* live ranking panel (design system: card-outlined) */
	.rank {
		width: 234px; flex-shrink: 0; background: var(--surface);
		border: 1px solid var(--border); border-radius: 14px; padding: 18px;
		align-self: flex-start; position: sticky; top: 1rem;
	}
	.rank-year { font-size: 1.7rem; font-weight: 800; font-family: var(--font-mono); color: var(--text); line-height: 1; }
	.rank-pm { display: flex; align-items: center; gap: 9px; margin: 0.7rem 0 1rem; }
	.rank-pm img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
	.rank-pm-name { font-weight: 700; font-size: 0.85rem; color: var(--text); }
	.rank-pm-role { font-size: 0.72rem; color: var(--text-muted); }
	.rank-bars { display: flex; flex-direction: column; gap: 6px; }
	.rank-row { display: grid; grid-template-columns: 58px 1fr 34px; align-items: center; gap: 7px; font-size: 0.76rem; transition: opacity 0.15s; }
	.rank-row.dim { opacity: 0.3; }
	.rank-name { font-weight: 600; color: var(--text-secondary); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.rank-bar-wrap { background: var(--surface-2); border-radius: 3px; height: 14px; overflow: hidden; }
	.rank-bar { display: block; height: 100%; border-radius: 3px; transition: width 0.3s ease; }
	.rank-val { font-variant-numeric: tabular-nums; font-weight: 700; color: var(--text); text-align: right; }
	.rank-hint { font-size: 0.68rem; color: var(--text-muted); margin-top: 0.9rem; text-align: center; }

	.tooltip {
		position: fixed; pointer-events: none; background: var(--surface); color: var(--text);
		border: 1px solid var(--border); padding: 8px 10px; border-radius: 8px;
		font-size: 12px; line-height: 1.5; box-shadow: 0 6px 20px rgba(0,0,0,.3);
		z-index: 10; max-width: 240px;
	}
	.tt-head { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; font-weight: 700; }
	.sw { width: 11px; height: 11px; border-radius: 2px; flex-shrink: 0; }
	.tt-row { color: var(--text-secondary); }
	.tt-gov { color: var(--positive); margin-top: 2px; font-weight: 600; }

	@media (max-width: 760px) {
		.layout { flex-direction: column; }
		.rank { width: auto; position: static; }
	}
</style>
