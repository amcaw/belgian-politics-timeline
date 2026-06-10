import elections from './elections.json';
import { PARTIES, type Party } from './parties';

export interface PartyResult {
	id: string;
	seats: number;
	votes: number;
	seatShare: number;
	voteShare: number;
}

export interface Election {
	date: string;
	year: number;
	totalSeats: number;
	totalVotes: number;
	parties: PartyResult[];
}

export const ELECTIONS = elections as Election[];

// The thickness encodings (Toggle A). Seat counts are cross-verified (official
// IBZ API == Wikipedia on all 24 elections), so a single "seats" source.
export type Metric = 'seats' | 'votes';

export const METRIC_LABELS: Record<Metric, string> = {
	seats: 'Sièges',
	votes: 'Voix (%)'
};

// Returns the share [0..1] for a party result under the chosen metric.
export function share(p: PartyResult, metric: Metric): number {
	return metric === 'votes' ? p.voteShare : p.seatShare;
}

export function party(id: string): Party {
	return PARTIES[id] ?? PARTIES.other;
}

// seats a party held coming out of a given election (0 if absent)
export function seatsAtElection(electionDate: string, partyId: string): number {
	const e = ELECTIONS.find((x) => x.date === electionDate);
	return e?.parties.find((p) => p.id === partyId)?.seats ?? 0;
}

export { PARTIES, type Party };

// Governing coalitions per election (Toggle B). Filled from the reference
// agent's output; party ids reference PARTIES keys.
import coalitions from './coalitions.json';
export const COALITIONS = coalitions as Record<string, string[]>;

export function isGoverning(date: string, partyId: string): boolean {
	return (COALITIONS[date] ?? []).includes(partyId);
}

// the coalition party ids for a given government (from its verified composition)
export function coalitionOf(g: Government): string[] {
	return g.coalition.map((c) => c.id);
}
// seats a coalition party held at this government's formation
export function coalitionSeats(g: Government, partyId: string): number {
	return g.coalition.find((c) => c.id === partyId)?.seats ?? 0;
}
export function totalCoalitionSeats(g: Government): number {
	return g.coalition.reduce((s, c) => s + c.seats, 0);
}

// Governing spells per party: for the "who governs when" Gantt view. Each
// government covers [startYear, nextGovStartYear); a party in that government's
// coalition gets a spell over that span. Adjacent spells for the same party are
// merged so a party that stays in successive governments shows one continuous bar.
export interface Spell {
	partyId: string;
	start: number; // fractional year
	end: number; // fractional year
	governments: string[]; // government names covered
}
export function governingSpells(): Spell[] {
	const govs = GOVERNMENTS;
	const raw: Spell[] = [];
	govs.forEach((g, i) => {
		const start = govYear(g);
		const end = i < govs.length - 1 ? govYear(govs[i + 1]) : 2025.4;
		for (const pid of coalitionOf(g)) {
			raw.push({ partyId: pid, start, end, governments: [g.government] });
		}
	});
	// merge adjacent same-party spells
	const byParty = new Map<string, Spell[]>();
	for (const s of raw) {
		const arr = byParty.get(s.partyId) ?? [];
		arr.push(s);
		byParty.set(s.partyId, arr);
	}
	const merged: Spell[] = [];
	for (const [, arr] of byParty) {
		arr.sort((a, b) => a.start - b.start);
		let cur = { ...arr[0] };
		for (let i = 1; i < arr.length; i++) {
			if (arr[i].start <= cur.end + 0.01) {
				cur.end = Math.max(cur.end, arr[i].end);
				cur.governments.push(...arr[i].governments);
			} else {
				merged.push(cur);
				cur = { ...arr[i] };
			}
		}
		merged.push(cur);
	}
	return merged;
}

// Every federal government 1946-2024, placed at its start date — a continuous
// PM frieze (several governments per legislature).
import govData from './governments.json';
export interface CoalitionMember {
	id: string;
	seats: number;
}
export interface Government {
	name: string;
	government: string;
	startDate: string; // YYYY-MM-DD
	party: string;
	partyId: string;
	photo: string;
	wikiUrl: string;
	electionDate: string; // the election whose coalition this government belongs to
	coalition: CoalitionMember[]; // parties + seats AT FORMATION (verified vs Wikipedia)
	coalitionInherited?: boolean; // true if borrowed from a sibling government of the legislature
}
export const GOVERNMENTS = (govData as Government[])
	.slice()
	.sort((a, b) => a.startDate.localeCompare(b.startDate));

// fractional year for time positioning (e.g. 1981-12-17 -> 1981.96)
export function govYear(g: Government): number {
	const [y, m, d] = g.startDate.split('-').map(Number);
	return y + ((m - 1) * 30 + (d - 1)) / 365;
}

// ---- party lineage (same "line" across renames/successions) ----
import filiationData from './filiation.json';
const FILIATION = filiationData as { from: string; to: string; year: number; type: string }[];
// undirected lineage groups: a rename/succession/split links ids into one line so
// "years in power" follows a party through its name changes.
function lineageOf(id: string): Set<string> {
	const adj = new Map<string, Set<string>>();
	const link = (a: string, b: string) => {
		if (!adj.has(a)) adj.set(a, new Set());
		adj.get(a)!.add(b);
	};
	for (const f of FILIATION) {
		// follow renames + successions + splits (a split child continues the line)
		link(f.from, f.to);
		link(f.to, f.from);
	}
	const seen = new Set<string>([id]);
	const stack = [id];
	while (stack.length) {
		const cur = stack.pop()!;
		for (const n of adj.get(cur) ?? []) if (!seen.has(n)) { seen.add(n); stack.push(n); }
	}
	return seen;
}

// total years a party (and its lineage) has spent in federal government, and the
// earliest year its line first entered power. Used to show "it's always roughly
// the same parties".
export function yearsInPower(partyId: string): { years: number; since: number } {
	const line = lineageOf(partyId);
	const spells = governingSpells().filter((s) => line.has(s.partyId));
	if (!spells.length) return { years: 0, since: 0 };
	// merge overlapping spans across the whole lineage to avoid double counting
	const spans = spells.map((s) => [s.start, s.end] as [number, number]).sort((a, b) => a[0] - b[0]);
	let total = 0;
	let since = spans[0][0];
	let [cs, ce] = spans[0];
	for (let i = 1; i < spans.length; i++) {
		if (spans[i][0] <= ce + 0.01) ce = Math.max(ce, spans[i][1]);
		else { total += ce - cs; [cs, ce] = spans[i]; }
	}
	total += ce - cs;
	return { years: Math.round(total), since: Math.floor(since) };
}

// Key narrative moments to annotate on the timeline.
export interface Annotation {
	year: number;
	title: string;
	detail: string;
}
export const ANNOTATIONS: Annotation[] = [
	{ year: 1950, title: 'Dernière majorité absolue', detail: "Le PSC-CVP obtient 108 sièges sur 212 : la dernière fois qu'un seul parti gouverne seul." },
	{ year: 1968, title: 'Début de l’éclatement', detail: 'Sous tension communautaire, les grands partis nationaux commencent à se scinder en ailes flamande et francophone.' },
	{ year: 1981, title: 'Trois familles, six partis', detail: 'Chrétiens, socialistes et libéraux sont désormais tous divisés par la langue.' },
	{ year: 1999, title: 'Coalition arc-en-ciel', detail: 'Première coalition libéraux + socialistes + écologistes ; fin de 40 ans de domination chrétienne au pouvoir.' },
	{ year: 2010, title: 'La N-VA, premier parti', detail: 'Le parti nationaliste flamand arrive en tête ; record de 541 jours sans gouvernement.' },
	{ year: 2024, title: 'Paysage fragmenté', detail: 'Aucun parti au-dessus de 17 % : douze formations se partagent la Chambre.' }
];
