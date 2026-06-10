// Regenerates src/lib/data/coalitions.json from governments.json.
// For each election, coalitions = union of all party ids that governed
// during that legislature, remapped onto the ids actually present in
// that election (unitary-display conventions, cartel folds).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const elections = JSON.parse(readFileSync(join(root, 'src/lib/data/elections.json'), 'utf8'));
const governments = JSON.parse(readFileSync(join(root, 'src/lib/data/governments.json'), 'utf8'));

// Fallbacks applied when a government party id does not exist in the
// election's party list (display conventions: unitary parties, cartels).
const FALLBACKS = {
	cvp: ['cd-unitary'],
	psc: ['cd-unitary'],
	sp: ['sp-unitary'],
	ps: ['sp-unitary'],
	vooruit: ['spa'],
	spirit: ['spa'],
	pvv: ['lib-unitary'],
	prl: ['pvv', 'lib-unitary'],
	vld: ['pvv'],
	mr: ['prl'],
	openvld: ['vld'],
	nva: ['vu']
};

const idsByElection = new Map(elections.map((e) => [e.date, new Set(e.parties.map((p) => p.id))]));
const out = {};

for (const gov of governments) {
	const ids = idsByElection.get(gov.electionDate);
	if (!ids) {
		console.warn(`No election found for ${gov.government} (${gov.electionDate})`);
		continue;
	}
	out[gov.electionDate] ??= new Set();
	for (const { id } of gov.coalition) {
		const mapped = ids.has(id) ? id : (FALLBACKS[id] ?? []).find((f) => ids.has(f));
		if (!mapped) {
			console.warn(`Unmappable id "${id}" for ${gov.government} (${gov.electionDate})`);
			continue;
		}
		out[gov.electionDate].add(mapped);
	}
}

const json = Object.fromEntries(
	[...Object.entries(out)]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => [k, [...v]])
);
writeFileSync(join(root, 'src/lib/data/coalitions.json'), JSON.stringify(json, null, 2) + '\n');
console.log('coalitions.json written:', Object.keys(json).length, 'elections');
