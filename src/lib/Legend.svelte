<script lang="ts">
	import { ELECTIONS, party, renameChainOf } from './data';

	// Families in the same left-to-right order the bars use, with plain-language
	// names so non-political readers grasp the spectrum at a glance.
	const FAMILIES: { key: string; label: string }[] = [
		{ key: 'far-left', label: 'Extrême gauche' },
		{ key: 'socialist', label: 'Socialistes' },
		{ key: 'green', label: 'Écologistes' },
		{ key: 'christian-democrat', label: 'Démocrates-chrétiens' },
		{ key: 'regionalist', label: 'Régionalistes' },
		{ key: 'nationalist', label: 'Nationalistes flamands' },
		{ key: 'liberal', label: 'Libéraux' },
		{ key: 'far-right', label: 'Extrême droite' },
		{ key: 'other', label: 'Autres' }
	];

	const present = new Set(ELECTIONS.flatMap((e) => e.parties.map((p) => p.id)));
	for (const id of [...present]) present.add(renameChainOf(id).at(-1)!);
	const groups = FAMILIES.map((f) => ({
		...f,
		parties: [...present]
			.map((id) => party(id))
			.filter((p) => p.family === f.key)
			.sort((a, b) => a.label.localeCompare(b.label))
	})).filter((g) => g.parties.length);
</script>

<div class="legend">
	{#each groups as g (g.key)}
		<div class="group">
			<div class="group-title">{g.label}</div>
			<div class="chips">
				{#each g.parties as p (p.id)}
					<span class="chip"><span class="sw" style:background={p.color}></span>{p.label}</span>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.legend {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.6rem 1.2rem;
		margin-top: 1.5rem;
		padding-top: 1.2rem;
		border-top: 1px solid var(--divider);
	}
	.group-title {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		font-weight: 700;
		margin-bottom: 0.3rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 0.5rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-secondary);
	}
	.sw {
		width: 11px;
		height: 11px;
		border-radius: 3px;
		flex-shrink: 0;
		box-shadow: 0 0 0 1px var(--border);
	}
</style>
