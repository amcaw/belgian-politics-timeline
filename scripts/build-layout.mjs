// Computes the metro-map layout: for each canonical party that ever held a
// seat, its lane index (x position), and its lifespan (first/last election year
// in which it appears). Renamed/successor parties inherit their parent's lane
// so the "line" reads as one continuous metro line that changes name; true
// splits get adjacent lanes branching off the parent.
//
// Reads:  src/lib/data/elections.json, parties.ts (PARTIES order), filiation.json
// Writes: src/lib/data/layout.json   { lanes: {id: lane}, life: {id:[first,last]}, laneCount }
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const elections = JSON.parse(readFileSync(resolve(__dir, '../src/lib/data/elections.json'), 'utf8'));
const filiation = JSON.parse(readFileSync(resolve(__dir, '../src/lib/data/filiation.json'), 'utf8'));

// family order matching chart_2 (francophone-left .. flemish-right per family)
const FAMILY_ORDER = ['far-left', 'socialist', 'green', 'christian-democrat', 'regionalist', 'nationalist', 'liberal', 'far-right', 'other'];

// minimal party meta needed here (family + wing), mirrored from parties.ts
const META = JSON.parse(readFileSync(resolve(__dir, 'party-meta.json'), 'utf8'));

// lifespan per party from the actual data (years it held >=1 seat)
const life = {};
for (const e of elections) {
	if (e.error) continue;
	for (const p of e.parties) {
		if (p.seats > 0 || p.voteShare >= 0.01) {
			const l = life[p.id] ?? [e.year, e.year];
			l[0] = Math.min(l[0], e.year);
			l[1] = Math.max(l[1], e.year);
			life[p.id] = l;
		}
	}
}

const ids = Object.keys(life);

// "rename/succession/merge-into" edges let a child share the parent's lane.
const inheritParent = {}; // childId -> parentId (single inheritance for lane)
for (const f of filiation) {
	if ((f.type === 'rename' || f.type === 'succession') && ids.includes(f.to) && ids.includes(f.from)) {
		inheritParent[f.to] = f.from;
	}
}

// sort key: family, then wing, then earliest year
function wingRank(w) { return w === 'francophone' ? 0 : w === 'national' ? 1 : 2; }
function rootOf(id) {
	let c = id, guard = 0;
	while (inheritParent[c] && guard++ < 20) c = inheritParent[c];
	return c;
}
// group ids by their lineage root so a rename chain shares one lane
const rootGroups = {};
for (const id of ids) {
	const r = rootOf(id);
	(rootGroups[r] ??= []).push(id);
}
const roots = Object.keys(rootGroups);

roots.sort((a, b) => {
	const ma = META[a], mb = META[b];
	const fa = FAMILY_ORDER.indexOf(ma.family), fb = FAMILY_ORDER.indexOf(mb.family);
	if (fa !== fb) return fa - fb;
	const wa = wingRank(ma.wing), wb = wingRank(mb.wing);
	if (wa !== wb) return wa - wb;
	return life[a][0] - life[b][0];
});

// assign a lane to each root (and its rename-chain members share it)
const lanes = {};
roots.forEach((r, i) => {
	for (const id of rootGroups[r]) lanes[id] = i;
});
const laneCount = roots.length;

writeFileSync(
	resolve(__dir, '../src/lib/data/layout.json'),
	JSON.stringify({ lanes, life, laneCount, laneOrder: roots }, null, 2)
);

console.log('lanes assigned:', laneCount);
for (const r of roots) {
	console.log(`  lane ${String(lanes[r]).padStart(2)}  ${rootGroups[r].join(' -> ')}  (${life[r][0]}-${life[rootGroups[r].at(-1)][1]})`);
}
