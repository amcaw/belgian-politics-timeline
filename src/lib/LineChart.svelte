<script lang="ts">
	import * as d3 from 'd3';
	import CoalitionHeader from './CoalitionHeader.svelte';
	import {
		ELECTIONS,
		share,
		party,
		isGoverning,
		GOVERNMENTS,
		govYear,
		type Government,
		type Metric
	} from './data';

	let { metric = 'seats', powerMode = false }: { metric?: Metric; powerMode?: boolean } = $props();

	// Stepped multi-line chart: a party's share is the RESULT of an election and
	// stays constant during the whole legislature, then steps at the next election
	// (curveStepAfter). Reads the trajectory of each party as horizontal plateaus.

	const years = ELECTIONS.map((e) => e.year);

	const perElection = 82;
	const margin = { top: 30, right: 130, bottom: 28, left: 46 };
	const innerW = (years.length - 1) * perElection;
	const innerH = 580; // taller = more vertical room between ribbons
	const width = margin.left + innerW + margin.right;
	const height = margin.top + innerH + margin.bottom;

	const xi = (i: number) => (years.length === 1 ? 0 : (i / (years.length - 1)) * innerW);

	// parties that ever held a seat, by descending peak share (legend/draw order)
	const allIds = $derived.by(() => {
		const peak = new Map<string, number>();
		for (const e of ELECTIONS)
			for (const p of e.parties) {
				if (p.id === 'other') continue;
				peak.set(p.id, Math.max(peak.get(p.id) ?? 0, share(p, metric)));
			}
		return [...peak.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
	});

	function shareAt(i: number, id: string): number {
		const p = ELECTIONS[i].parties.find((q) => q.id === id);
		return p ? share(p, metric) : 0;
	}

	const yMax = $derived(
		Math.max(0.1, ...ELECTIONS.flatMap((_, i) => allIds.map((id) => shareAt(i, id))))
	);
	const y = $derived(d3.scaleLinear().domain([0, yMax]).range([innerH, 0]).nice());

	// Each party is a constant-thickness RIBBON: flat (plateau) during a legislature
	// at its share height, then a slope centered on the election connecting to the
	// next legislature's plateau — the blocks linked into a flow.
	const tileH = 7; // thinner ribbon → more space between parties
	const slope = perElection * 0.26; // half-width of the (rounded) transition
	const legEnd = (i: number) => (i < years.length - 1 ? xi(i + 1) : xi(i) + perElection);

	const presentAt = (i: number, id: string) => shareAt(i, id) > 0;
	const governingAt = (i: number, id: string) => isGoverning(ELECTIONS[i].date, id);

	// centerline (polyline) of a party's ribbon, per contiguous run where `mask` is
	// true (defaults to presence; pass a governing mask for the power view).
	function centerRuns(id: string, mask?: (i: number) => boolean): { x: number; y: number }[][] {
		const ok = mask ?? ((i: number) => presentAt(i, id));
		const runs: { x: number; y: number }[][] = [];
		let run: { x: number; y: number }[] = [];
		for (let i = 0; i < years.length; i++) {
			if (!ok(i)) { if (run.length) { runs.push(run); run = []; } continue; }
			const yi = y(shareAt(i, id));
			const left = i === 0 || !ok(i - 1) ? xi(i) : xi(i) + slope;
			const right = i === years.length - 1 || !ok(i + 1) ? legEnd(i) : xi(i + 1) - slope;
			run.push({ x: left, y: yi }, { x: right, y: yi });
		}
		if (run.length) runs.push(run);
		return runs;
	}

	// build a constant-thickness ribbon path from a centerline, with smoothly
	// rounded transitions between plateaus (curveMonotoneX keeps the flats flat).
	const edge = d3
		.line<{ x: number; y: number }>()
		.x((d) => d.x)
		.y((d) => d.y)
		.curve(d3.curveMonotoneX);
	function ribbon(center: { x: number; y: number }[]): string {
		if (!center.length) return '';
		const top = center.map((p) => ({ x: p.x, y: p.y - tileH / 2 }));
		const bot = [...center].reverse().map((p) => ({ x: p.x, y: p.y + tileH / 2 }));
		return `${edge(top)} L${edge(bot)!.slice(1)} Z`;
	}
	function ribbonsOf(id: string): string[] {
		return centerRuns(id).map(ribbon);
	}
	// power view: ribbons only over the legislatures the party was in government
	function governingRibbonsOf(id: string): string[] {
		return centerRuns(id, (i) => presentAt(i, id) && governingAt(i, id)).map(ribbon);
	}

	// government featured in the header (power view): the one at the hovered
	// legislature, else the most recent.
	let hoverYear = $state<number | null>(null);
	const featured = $derived.by((): Government | undefined => {
		if (hoverYear != null) {
			const e = ELECTIONS.find((x) => x.year === hoverYear);
			if (e) {
				const g = GOVERNMENTS.filter((x) => x.electionDate === e.date).sort(
					(a, b) => govYear(a) - govYear(b)
				)[0];
				if (g) return g;
			}
		}
		return GOVERNMENTS[GOVERNMENTS.length - 1];
	});

	// label position: at the last legislature where the party is present
	function endLabel(id: string) {
		const runs = centerRuns(id);
		if (!runs.length) return null;
		const last = runs[runs.length - 1];
		const pt = last[last.length - 1];
		return { x: pt.x + 4, y: pt.y };
	}

	let hovered = $state<string | null>(null);
	let tip = $state<{ x: number; y: number; id: string; year: number; v: number } | null>(null);
	function move(id: string, i: number, ev: MouseEvent) {
		hovered = id;
		hoverYear = years[i];
		tip = { x: ev.clientX, y: ev.clientY, id, year: years[i], v: shareAt(i, id) };
	}
	function leave() { hovered = null; tip = null; hoverYear = null; }
	const pct = (s: number) => (s * 100).toFixed(1) + '%';
</script>

{#if powerMode && featured}
	<CoalitionHeader {featured} />
{/if}

<div class="line-wrap">
	<svg viewBox="0 0 {width} {height}" {width} {height} role="img"
		aria-label="Évolution des partis en lignes, 1946-2024" onmouseleave={leave}>
		<g transform="translate({margin.left},{margin.top})">
			<!-- y gridlines (%) -->
			{#each y.ticks(6) as t}
				<line class="grid" x1={0} x2={innerW} y1={y(t)} y2={y(t)} />
				<text class="ytick" x={-8} y={y(t)}>{Math.round(t * 100)}%</text>
			{/each}

			<!-- election columns + year labels on top -->
			{#each ELECTIONS as e, i}
				<line class="vgrid" x1={xi(i)} x2={xi(i)} y1={0} y2={innerH} />
				<text class="year" x={xi(i)} y={-12} class:year-active={tip?.year === e.year}>{e.year}</text>
			{/each}

			<!-- one constant-thickness ribbon per party (blocks linked into a flow).
			     In power mode: grey over the whole presence, colour only the
			     legislatures the party was in government. -->
			{#each allIds as id (id)}
				{@const p = party(id)}
				{@const dim = hovered && hovered !== id}
				{#each ribbonsOf(id) as d (d)}
					<path {d} fill={powerMode ? 'var(--band-muted)' : p.color}
						class="ribbon" class:dim class:hl={!powerMode && hovered === id}
						role="presentation" />
				{/each}
				{#if powerMode}
					{#each governingRibbonsOf(id) as d (d)}
						<path {d} fill={p.color} class="ribbon gov" class:dim class:hl={hovered === id}
							role="presentation" />
					{/each}
				{/if}
				<!-- per-legislature hover hit-areas -->
				{#each ELECTIONS as e, i}
					{#if shareAt(i, id) > 0}
						<rect x={xi(i)} y={y(shareAt(i, id)) - tileH / 2}
							width={legEnd(i) - xi(i)} height={tileH} fill="transparent"
							class="hit" role="presentation"
							onmouseenter={(ev) => move(id, i, ev)} onmousemove={(ev) => move(id, i, ev)}
							onmouseleave={leave} />
					{/if}
				{/each}
			{/each}

			<!-- end labels -->
			{#each allIds as id (id)}
				{@const p = party(id)}
				{@const l = endLabel(id)}
				{#if l}
					<text class="lline-label" x={l.x + 6} y={l.y} fill={p.color}
						class:dim={hovered && hovered !== id}>{p.label}</text>
				{/if}
			{/each}
		</g>
	</svg>

	{#if tip}
		{@const p = party(tip.id)}
		<div class="tooltip" style:left="{tip.x + 14}px" style:top="{tip.y + 14}px">
			<div class="tt-head"><span class="sw" style:background={p.color}></span><strong>{p.label}</strong></div>
			<div class="tt-row">{tip.year} · {metric === 'seats' ? 'Sièges' : 'Voix'} : <b>{pct(tip.v)}</b></div>
		</div>
	{/if}
</div>

<style>
	.line-wrap { position: relative; overflow-x: auto; border-radius: 14px;
		border: 1px solid var(--border); background: var(--chart-bg); }
	svg { display: block; }
	.grid { stroke: var(--chart-grid); stroke-width: 1; }
	.vgrid { stroke: var(--chart-grid); stroke-width: 1; opacity: 0.5; }
	.ytick { fill: var(--text-muted); font-size: 10px; text-anchor: end; dominant-baseline: middle;
		font-family: var(--font-mono); }
	.year { fill: var(--text-muted); font-size: 10px; font-weight: 600; text-anchor: middle;
		font-family: var(--font-mono); transition: fill 0.15s; }
	.year-active { fill: var(--text); font-weight: 700; }
	.ribbon { transition: opacity 0.15s; stroke: var(--chart-bg); stroke-width: 0.5; }
	.ribbon.dim { opacity: 0.14; }
	.ribbon.hl { stroke: var(--text); stroke-width: 1; }
	.hit { cursor: pointer; }
	.lline-label { font-size: 11px; font-weight: 700; dominant-baseline: middle;
		font-family: system-ui, sans-serif; pointer-events: none; transition: opacity 0.15s; }
	.lline-label.dim { opacity: 0.12; }
	.tooltip { position: fixed; pointer-events: none; background: var(--surface); color: var(--text);
		border: 1px solid var(--border); padding: 7px 10px; border-radius: 8px; font-size: 12px;
		box-shadow: 0 6px 20px rgba(0,0,0,.3); z-index: 10; }
	.tt-head { display: flex; align-items: center; gap: 6px; font-weight: 700; }
	.sw { width: 11px; height: 11px; border-radius: 2px; }
	.tt-row { color: var(--text-secondary); margin-top: 2px; }
</style>
