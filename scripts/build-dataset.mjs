// Builds the dataset the app consumes. SEATS follow the conventional Wikipedia
// tabulation (consolidated cartels, so each election matches the familiar
// tables, e.g. 1971 PSC-CVP=67). VOTE SHARE comes from the official IBZ API.
//
// Seat source: /tmp/wiki-gathered.json  (24 elections, independently verified)
// Vote source: src/lib/data/api-elections.json
// Writes:      src/lib/data/elections.json
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ---- canonical id mapping for Wikipedia labels ----
// Transition years keep the UNITARY cartel id where Wikipedia consolidates
// (christian-dem unitary through 1968; socialist unitary through 1978; liberal
// unitary through 1968). After that each wing is its own id.
const WIKI_MAP = {
	// christian democrats
	'CVP/PSC': 'cd-unitary', 'CVP-PSC': 'cd-unitary', 'PSC-CVP': 'cd-unitary',
	'PSC-CVP (JOINT LIST)': 'cd-unitary', 'CHRISTIAN SOCIAL RALLY OF LIBERTY': 'cd-unitary',
	CVP: 'cvp', 'CD&V': 'cdv', 'CD&V/N-VA': 'cdv-nva-cartel', PSC: 'psc', CDH: 'cdh',
	'LES ENGAGÉS': 'engages',
	// socialists
	'BSP/PSB': 'sp-unitary',
	SP: 'sp', 'SP.A': 'spa', 'SP.A-SPIRIT': 'spa', VOORUIT: 'vooruit', PS: 'ps',
	'RED LIONS': 'other', 'POW-PWT': 'other',
	// liberals
	'LIBERAL PARTY': 'lib-unitary', 'LIBERAL PARTY (PVV-PRL)': 'lib-unitary',
	'LIBERAL PARTY (PVV/PLP)': 'lib-unitary', 'LIBERAL PARTY (PVV/PRL)': 'lib-unitary',
	'PVV/PLP': 'lib-unitary', 'PVV-PLP': 'lib-unitary',
	'LIBERAL-SOCIALIST CARTELS': 'lib-unitary', 'LIBERAL-SOCIALIST KARTELS': 'lib-unitary',
	PVV: 'pvv', VLD: 'vld', 'OPEN VLD': 'openvld', PRL: 'prl', PRLW: 'prl', MR: 'mr',
	'PRL-FDF': 'prl-fdf-cartel',
	// flemish nationalists
	VU: 'vu', 'VU (VOLKSUNIE)': 'vu', "VU (CHRISTIAN FLEMISH PEOPLE'S UNION)": 'vu', 'N-VA': 'nva',
	// greens
	AGALEV: 'agalev', GROEN: 'groen', ECOLO: 'ecolo',
	// far right
	'VLAAMS BLOK': 'vlaamsblok', 'VLAAMS BELANG': 'vlaamsbelang', FN: 'fn',
	// far left
	'KPB/PCB': 'kpb', 'KPB-PCB': 'kpb', 'PCB-KPB': 'kpb', 'PCB/KPB': 'kpb',
	'KPB/PCB (COMMUNIST)': 'kpb', 'PTB-PVDA': 'ptb',
	// regionalists
	FDF: 'fdf', DÉFI: 'fdf', 'FDF-PW': 'fdf', 'FDF-PDLP': 'fdf', 'FDF-RW': 'fdf-rw-cartel',
	'FDF-RW (JOINT LIST)': 'fdf-rw-cartel',
	RW: 'rw', 'RW (RASSEMBLEMENT NATIONAL)': 'rw', FW: 'rw',
	// other
	LDD: 'ld', ROSSEM: 'rossem', PP: 'pp', 'UDRT-RAD': 'udrt', UDB: 'udb', UDP: 'other',
	INDEPENDENTS: 'other'
};

// cartels split into wing ids by fixed shares (integers summing to the bundle)
const CARTEL_SPLITS = {
	'cdv-nva-cartel': [{ id: 'cdv', share: 0.8 }, { id: 'nva', share: 0.2 }], // 2007: 30 -> 24/6
	'prl-fdf-cartel': [{ id: 'prl', share: 0.8 }, { id: 'fdf', share: 0.2 }],
	'fdf-rw-cartel': [{ id: 'fdf', share: 0.5 }, { id: 'rw', share: 0.5 }]
};

const normWiki = (raw) => WIKI_MAP[raw.trim().toUpperCase()] ?? 'other';

// ---- API label mapping (for VOTE share only) ----
const API_MAP = {
	'PSC/CVP': 'cd-unitary', CVP: 'cvp', 'CD&V': 'cdv', PSC: 'psc', CDH: 'cdh',
	'LES ENGAGÉS': 'engages',
	'SOCIALISTISCHE PARTIJ/ P': 'sp-unitary', 'BSP/PSB': 'sp-unitary', 'PSB-BSP': 'sp-unitary',
	BSP: 'sp', PSB: 'ps', 'PSB(BRUX)': 'ps', 'PSB(LUX)': 'ps', SP: 'sp', 'SP.A': 'spa',
	VOORUIT: 'vooruit', PS: 'ps',
	'PARTI LIBERALE/LIBERALE': 'lib-unitary', 'PVV/PLP': 'lib-unitary', PLP: 'lib-unitary',
	'PLP(BRUX).': 'lib-unitary', PVV: 'pvv', VLD: 'vld', OPENVLD: 'openvld', 'OPEN VLD': 'openvld',
	PRL: 'prl', PRLW: 'prl', MR: 'mr',
	VOLKSUNIE: 'vu', VU: 'vu', 'N-VA': 'nva',
	AGALEV: 'agalev', GROEN: 'groen', 'GROEN!': 'groen', ECOLO: 'ecolo',
	'VLAAMS BLOK': 'vlaamsblok', 'VLAAMS BELANG': 'vlaamsbelang', FN: 'fn',
	'KPB/PCB': 'kpb', PCB: 'kpb', KP: 'kpb', PC: 'kpb', COMMUNIST: 'kpb', PVDA: 'ptb',
	FDF: 'fdf', 'FDF/PPW': 'fdf', DÉFI: 'fdf', RW: 'rw',
	'LIJST DEDECKER': 'ld', ROSSEM: 'rossem', 'PARTI POPULAIRE': 'pp',
	'RAD/UDRT': 'udrt', 'UDRT/RA': 'udrt', UDB: 'udb',
	// API transition fragments fold into the unitary cartel to match seats convention
	'PSC/CVP': 'cd-unitary', 'PVV/PLP': 'lib-unitary', 'FDF-RW': 'fdf', 'PSB(BRUX)': 'ps'
};
const normApi = (raw) => API_MAP[raw.trim().toUpperCase()] ?? 'other';

function splitInto(total, splits) {
	let remaining = total;
	const out = {};
	splits.forEach((s, i) => {
		const v = i === splits.length - 1 ? remaining : Math.round(total * s.share);
		remaining -= v;
		out[s.id] = v;
	});
	return out;
}

// ---- load sources ----
const wiki = JSON.parse(readFileSync('/tmp/wiki-gathered.json', 'utf8'));
const api = JSON.parse(readFileSync(resolve(__dir, '../src/lib/data/api-elections.json'), 'utf8'));
const apiByYear = {};
for (const e of api) if (!e.error) apiByYear[e.date.slice(0, 4)] = e;

const wikiYears = Object.keys(wiki).sort();

const out = wikiYears.map((dt) => {
	const year = +dt.slice(0, 4);
	const w = wiki[dt];
	const totalSeats = w.totalSeats;

	// --- SEATS from Wikipedia (consolidated), cartels split to wings ---
	// Transition smoothing so each year matches the conventional tables:
	// christian-dems shown unitary through 1971, split from 1974; socialists
	// unitary through 1978, split from 1981.
	const cdUnitaryYears = new Set([1946, 1949, 1950, 1954, 1958, 1961, 1965, 1968, 1971]);
	const spUnitaryYears = new Set([1946, 1949, 1950, 1954, 1958, 1961, 1965, 1968, 1971, 1974, 1977, 1978]);

	const seatAgg = new Map();
	const addSeat = (id, n) => seatAgg.set(id, (seatAgg.get(id) ?? 0) + n);
	for (const p of w.parties) {
		let id = normWiki(p.party);
		// fold wing ids back into the unitary cartel during transition years
		if (cdUnitaryYears.has(year) && (id === 'cvp' || id === 'psc')) id = 'cd-unitary';
		if (spUnitaryYears.has(year) && (id === 'sp' || id === 'ps')) id = 'sp-unitary';
		const split = CARTEL_SPLITS[id];
		if (split) {
			const parts = splitInto(p.seats, split);
			for (const [cid, n] of Object.entries(parts)) addSeat(cid, n);
		} else {
			addSeat(id, p.seats);
		}
	}

	// --- VOTES from API ---
	// Cartels in the API bundle votes under one label; split them across wings the
	// same way as seats so each party gets a coherent vote share (e.g. the 2007
	// "CD&V NVA" cartel votes split 80/20, "sp.a-spirit" → sp.a).
	const VOTE_CARTELS = {
		'CD&V NVA': [{ id: 'cdv', share: 0.8 }, { id: 'nva', share: 0.2 }],
		'sp.a-spirit': [{ id: 'spa', share: 1.0 }],
		'PRL-FDF': [{ id: 'prl', share: 0.8 }, { id: 'fdf', share: 0.2 }],
		'FDF-RW': [{ id: 'fdf', share: 0.5 }, { id: 'rw', share: 0.5 }]
	};
	const voteAgg = new Map();
	const apiE = apiByYear[String(year)];
	let totalVotes = 0;
	const addVote = (id, v) => voteAgg.set(id, (voteAgg.get(id) ?? 0) + v);
	if (apiE) {
		for (const p of apiE.parties) {
			totalVotes += p.votes;
			const cartel = VOTE_CARTELS[p.partyLabel];
			if (cartel) {
				for (const c of cartel) addVote(c.id, Math.round(p.votes * c.share));
				continue;
			}
			let id = normApi(p.partyLabel);
			if (cdUnitaryYears.has(year) && (id === 'cvp' || id === 'psc')) id = 'cd-unitary';
			if (spUnitaryYears.has(year) && (id === 'sp' || id === 'ps')) id = 'sp-unitary';
			addVote(id, p.votes);
		}
	}

	const ids = new Set([...seatAgg.keys(), ...voteAgg.keys()]);
	const parties = [...ids]
		.map((id) => {
			const seats = seatAgg.get(id) ?? 0;
			const votes = voteAgg.get(id) ?? 0;
			return {
				id,
				seats,
				votes,
				seatShare: seats / totalSeats,
				voteShare: totalVotes ? votes / totalVotes : 0
			};
		})
		.filter((p) => p.seats > 0 || p.voteShare >= 0.01)
		.sort((a, b) => b.seats - a.seats || b.votes - a.votes);

	return { date: dt, year, totalSeats, totalVotes, parties };
});

writeFileSync(resolve(__dir, '../src/lib/data/elections.json'), JSON.stringify(out, null, 2));

// ---- sanity report ----
console.log('year  total seatSum  top parties');
for (const e of out) {
	const seatSum = e.parties.reduce((s, p) => s + p.seats, 0);
	const flag = seatSum !== e.totalSeats ? ' ⚠' : '  ';
	const top = e.parties.filter((p) => p.seats > 0).slice(0, 4).map((p) => `${p.id} ${p.seats}`).join(', ');
	console.log(`${e.year} ${String(e.totalSeats).padStart(4)}  ${String(seatSum).padStart(4)}${flag}   ${top}`);
}
