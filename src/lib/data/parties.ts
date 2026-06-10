// Canonical Belgian federal parties (1946-2024), their colors (per the
// conventional Belgian political color scheme used in chart_2), political
// family, and linguistic wing. Plus a normalization layer that maps the
// messy raw API party labels onto these canonical ids.

export type Family =
	| 'christian-democrat'
	| 'socialist'
	| 'liberal'
	| 'green'
	| 'nationalist'
	| 'far-right'
	| 'far-left'
	| 'regionalist'
	| 'other';

export type Wing = 'flemish' | 'francophone' | 'national';

export interface Party {
	id: string;
	label: string;
	fullName: string;
	color: string;
	family: Family;
	wing: Wing;
}

// Canonical party registry. Colors follow Belgian conventions:
// christian-dem = orange, socialist = red, liberal = blue, green = green,
// flemish-nationalist = yellow, far-right = dark navy, far-left = dark red,
// francophone-regionalist = magenta/pink.
export const PARTIES: Record<string, Party> = {
	// --- Christian democrats ---
	'cd-unitary': { id: 'cd-unitary', label: 'PSC-CVP', fullName: 'Parti social-chrétien / Christelijke Volkspartij (unitary)', color: '#e8821e', family: 'christian-democrat', wing: 'national' },
	cvp: { id: 'cvp', label: 'CVP', fullName: 'Christelijke Volkspartij', color: '#ed8b00', family: 'christian-democrat', wing: 'flemish' },
	cdv: { id: 'cdv', label: 'CD&V', fullName: 'Christen-Democratisch en Vlaams', color: '#f5822a', family: 'christian-democrat', wing: 'flemish' },
	psc: { id: 'psc', label: 'PSC', fullName: 'Parti social-chrétien', color: '#d4711a', family: 'christian-democrat', wing: 'francophone' },
	cdh: { id: 'cdh', label: 'cdH', fullName: 'Centre démocrate humaniste', color: '#f4a300', family: 'christian-democrat', wing: 'francophone' },
	engages: { id: 'engages', label: 'Les Engagés', fullName: 'Les Engagés', color: '#00b3a4', family: 'christian-democrat', wing: 'francophone' },

	// --- Socialists ---
	'sp-unitary': { id: 'sp-unitary', label: 'BSP-PSB', fullName: 'Belgische Socialistische Partij / Parti Socialiste Belge (unitary)', color: '#e30613', family: 'socialist', wing: 'national' },
	sp: { id: 'sp', label: 'SP', fullName: 'Socialistische Partij', color: '#e30613', family: 'socialist', wing: 'flemish' },
	spa: { id: 'spa', label: 'sp.a', fullName: 'Socialistische Partij Anders', color: '#fa1e29', family: 'socialist', wing: 'flemish' },
	vooruit: { id: 'vooruit', label: 'Vooruit', fullName: 'Vooruit', color: '#c1124a', family: 'socialist', wing: 'flemish' },
	ps: { id: 'ps', label: 'PS', fullName: 'Parti Socialiste', color: '#e8112d', family: 'socialist', wing: 'francophone' },

	// --- Liberals ---
	'lib-unitary': { id: 'lib-unitary', label: 'Liberals/PVV-PLP', fullName: 'Parti de la Liberté et du Progrès / Partij voor Vrijheid en Vooruitgang (unitary)', color: '#1f6fc4', family: 'liberal', wing: 'national' },
	pvv: { id: 'pvv', label: 'PVV', fullName: 'Partij voor Vrijheid en Vooruitgang', color: '#1f6fc4', family: 'liberal', wing: 'flemish' },
	vld: { id: 'vld', label: 'VLD', fullName: 'Vlaamse Liberalen en Democraten', color: '#1f78d1', family: 'liberal', wing: 'flemish' },
	openvld: { id: 'openvld', label: 'Open Vld', fullName: 'Open Vlaamse Liberalen en Democraten', color: '#0166b1', family: 'liberal', wing: 'flemish' },
	prl: { id: 'prl', label: 'PRL', fullName: 'Parti Réformateur Libéral', color: '#1e5fae', family: 'liberal', wing: 'francophone' },
	mr: { id: 'mr', label: 'MR', fullName: 'Mouvement Réformateur', color: '#143d8c', family: 'liberal', wing: 'francophone' },

	// --- Flemish nationalists ---
	vu: { id: 'vu', label: 'Volksunie', fullName: 'Volksunie', color: '#f3c300', family: 'nationalist', wing: 'flemish' },
	nva: { id: 'nva', label: 'N-VA', fullName: 'Nieuw-Vlaamse Alliantie', color: '#ffd200', family: 'nationalist', wing: 'flemish' },

	// --- Greens ---
	agalev: { id: 'agalev', label: 'Agalev', fullName: 'Anders Gaan Leven', color: '#7ac143', family: 'green', wing: 'flemish' },
	groen: { id: 'groen', label: 'Groen', fullName: 'Groen', color: '#48a23f', family: 'green', wing: 'flemish' },
	ecolo: { id: 'ecolo', label: 'Ecolo', fullName: 'Ecolo', color: '#9bca3c', family: 'green', wing: 'francophone' },

	// --- Far right ---
	vlaamsblok: { id: 'vlaamsblok', label: 'Vlaams Blok', fullName: 'Vlaams Blok', color: '#33342e', family: 'far-right', wing: 'flemish' },
	vlaamsbelang: { id: 'vlaamsbelang', label: 'Vlaams Belang', fullName: 'Vlaams Belang', color: '#fcd003', family: 'far-right', wing: 'flemish' },
	fn: { id: 'fn', label: 'FN', fullName: 'Front National', color: '#1c1c2b', family: 'far-right', wing: 'francophone' },

	// --- Far left / communist ---
	kpb: { id: 'kpb', label: 'KPB-PCB', fullName: 'Kommunistische Partij van België / Parti Communiste de Belgique', color: '#8c1010', family: 'far-left', wing: 'national' },
	ptb: { id: 'ptb', label: 'PVDA-PTB', fullName: 'Partij van de Arbeid / Parti du Travail de Belgique', color: '#aa121d', family: 'far-left', wing: 'national' },

	// --- Regionalists (francophone) ---
	fdf: { id: 'fdf', label: 'FDF/DéFI', fullName: 'Front Démocratique des Francophones / DéFI', color: '#e6007e', family: 'regionalist', wing: 'francophone' },
	rw: { id: 'rw', label: 'RW', fullName: 'Rassemblement Wallon', color: '#c8005a', family: 'regionalist', wing: 'francophone' },

	// --- Other / minor ---
	ld: { id: 'ld', label: 'LDD', fullName: 'Lijst Dedecker', color: '#7b5aa6', family: 'other', wing: 'flemish' },
	rossem: { id: 'rossem', label: 'ROSSEM', fullName: 'ROSSEM', color: '#9aa0a6', family: 'other', wing: 'national' },
	pp: { id: 'pp', label: 'PP', fullName: 'Parti Populaire', color: '#6b4f9e', family: 'other', wing: 'francophone' },
	udrt: { id: 'udrt', label: 'UDRT-RAD', fullName: 'Union Démocratique pour le Respect du Travail', color: '#9aa0a6', family: 'other', wing: 'national' },
	udb: { id: 'udb', label: 'UDB', fullName: 'Union Démocratique Belge', color: '#9aa0a6', family: 'other', wing: 'national' },
	other: { id: 'other', label: 'Other', fullName: 'Other / minor parties', color: '#bdbdbd', family: 'other', wing: 'national' }
};
