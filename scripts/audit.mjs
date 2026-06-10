// Comprehensive data audit: internal consistency across elections.json,
// governments.json, coalitions.json, filiation.json, parties.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const data = (f) => JSON.parse(readFileSync(join(here, '../src/lib/data', f), 'utf8'));

const elections = data('elections.json');
const governments = data('governments.json');
const coalitions = data('coalitions.json');
const filiation = data('filiation.json');

// extract party ids from parties.ts (crude parse)
const partiesTs = readFileSync(join(here, '../src/lib/data/parties.ts'), 'utf8');
const idMatches = [...partiesTs.matchAll(/^\t(?:'([\w-]+)'|([\w]+)):\s*\{\s*id:/gm)].map(
	(m) => m[1] ?? m[2]
);
const PARTY_IDS = new Set(idMatches);
console.log(`Registered party ids (${PARTY_IDS.size}):`, [...PARTY_IDS].join(', '));

let issues = 0;
const warn = (msg) => {
	issues++;
	console.log('  ⚠ ' + msg);
};

// Display-convention aliases: an id "counts as" any of these when matching
// against an election's party list (unitary parties, cartel folds).
const ALIASES = {
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
const matchesIn = (id, idSet) =>
	idSet.has(id) || (ALIASES[id] ?? []).some((a) => idSet.has(a));

console.log('\n=== 1. ELECTIONS ===');
const expectedTotals = (y) => (y === 1946 ? 202 : y <= 1991 ? 212 : 150);
for (const e of elections) {
	const seatSum = e.parties.reduce((s, p) => s + p.seats, 0);
	const voteSum = e.parties.reduce((s, p) => s + p.votes, 0);
	const seatShareSum = e.parties.reduce((s, p) => s + p.seatShare, 0);
	const voteShareSum = e.parties.reduce((s, p) => s + p.voteShare, 0);
	if (seatSum !== e.totalSeats) warn(`${e.year}: seat sum ${seatSum} != totalSeats ${e.totalSeats}`);
	if (e.totalSeats !== expectedTotals(e.year))
		warn(`${e.year}: totalSeats ${e.totalSeats} != expected ${expectedTotals(e.year)}`);
	// totalVotes is the official total; tiny lists below threshold are dropped,
	// so party votes may sum slightly below it (documented convention).
	if (voteSum > e.totalVotes) warn(`${e.year}: vote sum ${voteSum} > totalVotes ${e.totalVotes}`);
	else if ((e.totalVotes - voteSum) / e.totalVotes > 0.02)
		warn(`${e.year}: dropped-lists gap ${(((e.totalVotes - voteSum) / e.totalVotes) * 100).toFixed(2)}% exceeds 2%`);
	if (Math.abs(seatShareSum - 1) > 1e-9) warn(`${e.year}: seatShare sum ${seatShareSum}`);
	if (voteShareSum > 1 + 1e-6 || voteShareSum < 0.98)
		warn(`${e.year}: voteShare sum ${voteShareSum} outside [0.98, 1]`);
	for (const p of e.parties) {
		if (!PARTY_IDS.has(p.id)) warn(`${e.year}: unregistered party id "${p.id}"`);
		if (p.seats > 0 && p.votes === 0) warn(`${e.year}: ${p.id} has seats but 0 votes`);
		if (Math.abs(p.seatShare - p.seats / e.totalSeats) > 1e-9)
			warn(`${e.year}: ${p.id} seatShare mismatch`);
		if (Math.abs(p.voteShare - p.votes / e.totalVotes) > 1e-9)
			warn(`${e.year}: ${p.id} voteShare mismatch`);
		// vote share vs seat share divergence > 12 pts is suspicious under PR
		const d = Math.abs(p.seatShare - p.voteShare);
		if (d > 0.12) warn(`${e.year}: ${p.id} seatShare ${(p.seatShare*100).toFixed(1)} vs voteShare ${(p.voteShare*100).toFixed(1)} diverge ${(d*100).toFixed(1)}pts`);
	}
	const dup = new Set();
	for (const p of e.parties) {
		if (dup.has(p.id)) warn(`${e.year}: duplicate party id ${p.id}`);
		dup.add(p.id);
	}
}
console.log(`${elections.length} elections checked.`);

// which ids appear in which elections (for cross-file checks)
const idsByElection = new Map(elections.map((e) => [e.date, new Set(e.parties.map((p) => p.id))]));

console.log('\n=== 2. GOVERNMENTS ===');
console.log(`count: ${governments.length}`);
const govSorted = [...governments].sort((a, b) => a.startDate.localeCompare(b.startDate));
for (let i = 0; i < govSorted.length; i++) {
	const g = govSorted[i];
	const total = g.coalition.reduce((s, c) => s + c.seats, 0);
	const e = elections.find((x) => x.date === g.electionDate);
	if (!e) warn(`${g.government}: electionDate ${g.electionDate} not found`);
	const majority = e ? Math.floor(e.totalSeats / 2) + 1 : null;
	const tag = majority && total < majority ? ` (MINORITY ${total}/${e.totalSeats})` : '';
	console.log(
		`  ${g.startDate} ${g.government.padEnd(22)} total=${String(total).padStart(3)}${tag}`
	);
	for (const c of g.coalition) {
		if (!PARTY_IDS.has(c.id)) warn(`${g.government}: unregistered coalition party id "${c.id}"`);
		// coalition seats should not exceed that party's seats at the election (transfuges can lower, rarely raise)
		const eIds = idsByElection.get(g.electionDate) ?? new Set();
		const ep = e?.parties.find((p) => p.id === c.id);
		if (e && !ep && !matchesIn(c.id, eIds))
			warn(`${g.government}: coalition party "${c.id}" absent from election ${g.electionDate} (election has: ${[...eIds].join(',')})`);
		else if (ep && c.seats > ep.seats + 8 && g.electionDate <= g.startDate)
			warn(`${g.government}: ${c.id} coalition seats ${c.seats} >> election seats ${ep.seats}`);
	}
	// PM's party should be in the coalition (modulo display aliases)
	const coalIds = new Set(g.coalition.map((c) => c.id));
	if (!matchesIn(g.partyId, coalIds))
		warn(`${g.government}: PM party ${g.partyId} not in coalition`);
	// chronology: each gov should start after previous
	if (i > 0 && govSorted[i - 1].startDate >= g.startDate)
		warn(`${g.government}: startDate not strictly after ${govSorted[i - 1].government}`);
	// election date should precede start date (except caretaker era)
	if (g.electionDate > g.startDate) console.log(`    note: formed before its electionDate (${g.government})`);
}

console.log('\n=== 3. COALITIONS.JSON (per-election union, flux view) ===');
for (const [date, ids] of Object.entries(coalitions)) {
	const eIds = idsByElection.get(date);
	if (!eIds) { warn(`coalitions.json date ${date} not an election`); continue; }
	for (const id of ids) {
		if (!PARTY_IDS.has(id)) warn(`${date}: unregistered id "${id}"`);
		if (!eIds.has(id)) warn(`${date}: coalition id "${id}" not present in that election's parties (has: ${[...eIds].join(',')})`);
	}
	// compare against union of governments of that legislature (remapped to election ids)
	const govsOf = governments.filter((g) => g.electionDate === date);
	const remap = (id) => (eIds.has(id) ? id : (ALIASES[id] ?? []).find((a) => eIds.has(a)) ?? id);
	const union = new Set(govsOf.flatMap((g) => g.coalition.map((c) => remap(c.id))));
	const a = new Set(ids);
	const missing = [...union].filter((x) => !a.has(x));
	const extra = [...a].filter((x) => !union.has(x));
	if (missing.length) warn(`${date}: governments imply also [${missing.join(',')}] but coalitions.json omits them`);
	if (extra.length) warn(`${date}: coalitions.json has [${extra.join(',')}] not in any government of that legislature`);
}
// every election must have a coalition entry
for (const e of elections) if (!coalitions[e.date]) warn(`election ${e.date} missing from coalitions.json`);

console.log('\n=== 4. FILIATION ===');
for (const f of filiation) {
	if (!PARTY_IDS.has(f.from)) warn(`filiation from "${f.from}" unregistered`);
	if (!PARTY_IDS.has(f.to)) warn(`filiation to "${f.to}" unregistered`);
}

console.log('\n=== 5. GAPS IN GOVERNANCE TIMELINE ===');
// every moment 1946-2025 should be covered by some government (caretaker periods exist but spells model assumes continuity)
for (let i = 1; i < govSorted.length; i++) {
	const prev = govSorted[i - 1], cur = govSorted[i];
	const gapDays = (new Date(cur.startDate) - new Date(prev.startDate)) / 864e5;
	if (gapDays > 365 * 4.6) warn(`${prev.government} -> ${cur.government}: ${Math.round(gapDays)} days span`);
}

console.log('\n=== 6. YEARS-IN-POWER sanity (lineage walk) ===');
// replicate index.ts logic
const adj = new Map();
const link = (a, b) => { (adj.get(a) ?? adj.set(a, new Set()).get(a)).add(b); };
for (const f of filiation) { link(f.from, f.to); link(f.to, f.from); }
const lineageOf = (id) => {
	const seen = new Set([id]); const st = [id];
	while (st.length) for (const n of adj.get(st.pop()) ?? []) if (!seen.has(n)) { seen.add(n); st.push(n); }
	return seen;
};
const govYear = (g) => { const [y, m, d] = g.startDate.split('-').map(Number); return y + ((m - 1) * 30 + (d - 1)) / 365; };
const spells = [];
govSorted.forEach((g, i) => {
	const start = govYear(g);
	const end = i < govSorted.length - 1 ? govYear(govSorted[i + 1]) : 2025.4;
	for (const c of g.coalition) spells.push({ id: c.id, start, end });
});
const yearsInPower = (pid) => {
	const line = lineageOf(pid);
	const spans = spells.filter((s) => line.has(s.id)).map((s) => [s.start, s.end]).sort((a, b) => a[0] - b[0]);
	if (!spans.length) return 0;
	let total = 0, [cs, ce] = spans[0];
	for (let i = 1; i < spans.length; i++) {
		if (spans[i][0] <= ce + 0.01) ce = Math.max(ce, spans[i][1]);
		else { total += ce - cs; [cs, ce] = spans[i]; }
	}
	return Math.round(total + ce - cs);
};
for (const pid of ['engages', 'cdv', 'ps', 'vooruit', 'mr', 'openvld', 'nva', 'ecolo', 'vu', 'fdf', 'kpb'])
	console.log(`  ${pid.padEnd(10)} yearsInPower=${yearsInPower(pid)}`);

console.log(`\n=== DONE: ${issues} issues flagged ===`);
