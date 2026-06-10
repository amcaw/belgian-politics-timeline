<script lang="ts">
	import { base } from '$app/paths';
	import { governingSpells, party } from '$lib/data';
	import type { Family } from '$lib/data/parties';

	// ---- "one look" poster: one row per political family, 1945 → 2025 ----
	// Fixed-format 1080×1350 (4:5) SVG with hard-coded colors so the PNG export
	// is identical regardless of the site theme.

	const FAMILY_META: Partial<Record<Family, { label: string; sub: string; color: string }>> = {
		'christian-democrat': { label: 'Chrétiens-démocrates', sub: 'PSC-CVP → CD&V · cdH · Les Engagés', color: '#e8821e' },
		socialist: { label: 'Socialistes', sub: 'PSB-BSP → PS · sp.a / Vooruit', color: '#e8112d' },
		liberal: { label: 'Libéraux', sub: 'PVV-PLP → MR · Open Vld', color: '#1f6fc4' },
		nationalist: { label: 'Nationalistes flamands', sub: 'Volksunie → N-VA', color: '#f3c300' },
		green: { label: 'Écologistes', sub: 'Ecolo · Agalev / Groen', color: '#48a23f' },
		regionalist: { label: 'Régionalistes', sub: 'FDF · Rassemblement wallon', color: '#e6007e' },
		'far-left': { label: 'Communistes', sub: 'KPB-PCB', color: '#a33636' }
	};

	// merge governing spells per family
	const spells = governingSpells();
	const spansByFamily = new Map<Family, [number, number][]>();
	for (const s of spells) {
		const fam = party(s.partyId).family;
		if (!FAMILY_META[fam]) continue;
		const arr = spansByFamily.get(fam) ?? [];
		arr.push([s.start, s.end]);
		spansByFamily.set(fam, arr);
	}
	function merged(spans: [number, number][]): [number, number][] {
		const sorted = [...spans].sort((a, b) => a[0] - b[0]);
		const out: [number, number][] = [];
		let [cs, ce] = sorted[0];
		for (let i = 1; i < sorted.length; i++) {
			if (sorted[i][0] <= ce + 0.01) ce = Math.max(ce, sorted[i][1]);
			else { out.push([cs, ce]); [cs, ce] = sorted[i]; }
		}
		out.push([cs, ce]);
		return out;
	}
	const rows = [...spansByFamily.entries()]
		.map(([fam, spans]) => {
			const m = merged(spans);
			const years = Math.round(m.reduce((t, [a, b]) => t + (b - a), 0));
			return { fam, meta: FAMILY_META[fam]!, spans: m, years };
		})
		.sort((a, b) => b.years - a.years);

	const cdYears = rows.find((r) => r.fam === 'christian-democrat')?.years ?? 0;

	// ---- poster geometry ----
	const W = 1080;
	const H = 1350;
	const PAD = 70;
	const plotW = W - 2 * PAD;
	const Y0 = 1945;
	const Y1 = 2025.5;
	const x = (yr: number) => PAD + ((yr - Y0) / (Y1 - Y0)) * plotW;
	const chartTop = 360;
	const rowStep = 112;
	const barH = 38;
	const axisY = chartTop + rows.length * rowStep + 8;
	const decades = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

	const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

	// ---- PNG export: serialize SVG → draw on 2× canvas → download ----
	let svgEl = $state<SVGSVGElement | null>(null);
	let exporting = $state(false);
	function downloadPng() {
		if (!svgEl || exporting) return;
		exporting = true;
		const xml = new XMLSerializer().serializeToString(svgEl);
		const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = W * 2;
			canvas.height = H * 2;
			canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			canvas.toBlob((b) => {
				exporting = false;
				if (!b) return;
				const a = document.createElement('a');
				a.href = URL.createObjectURL(b);
				a.download = 'qui-gouverne-la-belgique.png';
				a.click();
				URL.revokeObjectURL(a.href);
			}, 'image/png');
		};
		img.onerror = () => { exporting = false; URL.revokeObjectURL(url); };
		img.src = url;
	}
</script>

<svelte:head>
	<title>Affiche · Qui gouverne la Belgique ?</title>
</svelte:head>

<main>
	<div class="bar">
		<a class="back" href="{base}/">← retour à la visualisation</a>
		<button class="dl" onclick={downloadPng} disabled={exporting}>
			{exporting ? 'Export…' : 'Télécharger PNG (2160×2700)'}
		</button>
	</div>

	<div class="poster-wrap">
		<svg
			bind:this={svgEl}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 {W} {H}"
			width={W}
			height={H}
			role="img"
			aria-label="Affiche : les familles politiques au gouvernement fédéral belge, 1945-2025"
		>
			<rect width={W} height={H} fill="#11141a" />

			<!-- title block -->
			<text x={PAD} y={122} font-family={FONT} font-size="58" font-weight="800"
				fill="#f4f5f7" letter-spacing="-1">Qui gouverne la Belgique&#8239;?</text>
			<text x={PAD} y={168} font-family={FONT} font-size="25" font-weight="500"
				fill="#9aa3b2">Les familles politiques au gouvernement fédéral, 1945 → 2025</text>

			<!-- punchline -->
			<text x={PAD} y={240} font-family={FONT} font-size="30" font-weight="600" fill="#d7dce4">
				Les chrétiens-démocrates ont gouverné
				<tspan fill="#e8821e" font-weight="800">{cdYears} ans sur 80</tspan>.
			</text>
			<text x={PAD} y={278} font-family={FONT} font-size="21" fill="#9aa3b2">
				Chaque barre = la famille participe à la coalition fédérale (50 gouvernements).
			</text>

			<!-- decade gridlines -->
			{#each decades as d (d)}
				<line x1={x(d)} x2={x(d)} y1={chartTop - 14} y2={axisY} stroke="#232833" stroke-width="1" />
				<text x={x(d)} y={axisY + 30} font-family={FONT} font-size="19" font-weight="600"
					fill="#788294" text-anchor="middle">{d}</text>
			{/each}

			<!-- 541-day caretaker record marker -->
			<line x1={x(2011)} x2={x(2011)} y1={chartTop - 14} y2={axisY}
				stroke="#f4f5f7" stroke-width="1.5" stroke-dasharray="4 5" opacity="0.55" />
			<text x={x(2011) - 10} y={chartTop - 24} font-family={FONT} font-size="18"
				font-weight="600" fill="#c2c9d4" text-anchor="end">541 jours sans gouvernement (2010-11) →</text>

			<!-- family rows -->
			{#each rows as r, i (r.fam)}
				{@const ty = chartTop + i * rowStep}
				{@const by = ty + 36}
				<text x={PAD} y={ty + 14} font-family={FONT} font-size="25" font-weight="800"
					fill={r.meta.color}>{r.meta.label}</text>
				<text x={PAD + 6 + r.meta.label.length * 13.6} y={ty + 13} font-family={FONT}
					font-size="17" fill="#788294">{r.meta.sub}</text>
				<text x={W - PAD} y={ty + 14} font-family={FONT} font-size="23" font-weight="700"
					fill="#d7dce4" text-anchor="end">{r.years} ans</text>
				<line x1={PAD} x2={W - PAD} y1={by + barH / 2} y2={by + barH / 2}
					stroke="#262b35" stroke-width="2" />
				{#each r.spans as [s, e] (s)}
					<rect x={x(s)} y={by} width={Math.max(3, x(e) - x(s))} height={barH}
						rx="6" fill={r.meta.color} />
				{/each}
			{/each}

			<!-- footer -->
			<line x1={PAD} x2={W - PAD} y1={H - 84} y2={H - 84} stroke="#232833" stroke-width="1" />
			<text x={PAD} y={H - 52} font-family={FONT} font-size="17" fill="#788294">
				Données : SPF Intérieur (electionresults.belgium.be) · Wikipédia — 50 gouvernements, de Van Acker II (1945) à De Wever (2025)
			</text>
			<text x={PAD} y={H - 26} font-family={FONT} font-size="17" fill="#586070">
				Chambre des représentants · les familles suivent les partis à travers scissions et renommages
			</text>
		</svg>
	</div>

	<p class="note">
		Version « affiche » pensée pour les réseaux sociaux (format 4:5). Les durées additionnent
		les années de toute la lignée d'une famille (ex. PSC-CVP → CD&V, cdH, Les Engagés), telles
		que détaillées dans la <a href="{base}/">visualisation complète</a>.
	</p>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 4rem;
	}
	.bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}
	.back {
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
	}
	.back:hover { color: var(--text); }
	.dl {
		border: none;
		background: var(--accent);
		color: var(--accent-contrast);
		font: 700 0.82rem var(--font);
		padding: 10px 18px;
		border-radius: 10px;
		cursor: pointer;
	}
	.dl:hover { filter: brightness(1.1); }
	.dl:disabled { opacity: 0.6; cursor: wait; }
	.poster-wrap {
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--border);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
	}
	.poster-wrap svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.note {
		margin-top: 1rem;
		font-size: 0.78rem;
		color: var(--text-muted);
		line-height: 1.55;
	}
	.note a { color: var(--text-secondary); }
</style>
