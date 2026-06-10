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

export { PARTIES, type Party };

// Governing coalitions per election (Toggle B). Filled from the reference
// agent's output; party ids reference PARTIES keys.
import coalitions from './coalitions.json';
export const COALITIONS = coalitions as Record<string, string[]>;

export function isGoverning(date: string, partyId: string): boolean {
	return (COALITIONS[date] ?? []).includes(partyId);
}

// the coalition parties for a given government (via its election)
export function coalitionOf(g: Government): string[] {
	return COALITIONS[g.electionDate] ?? [];
}

// Every federal government 1946-2024, placed at its start date — a continuous
// PM frieze (several governments per legislature).
import govData from './governments.json';
export interface Government {
	name: string;
	government: string;
	startDate: string; // YYYY-MM-DD
	party: string;
	partyId: string;
	photo: string;
	wikiUrl: string;
	electionDate: string; // the election whose coalition this government belongs to
}
export const GOVERNMENTS = (govData as Government[])
	.slice()
	.sort((a, b) => a.startDate.localeCompare(b.startDate));

// fractional year for time positioning (e.g. 1981-12-17 -> 1981.96)
export function govYear(g: Government): number {
	const [y, m, d] = g.startDate.split('-').map(Number);
	return y + ((m - 1) * 30 + (d - 1)) / 365;
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
