// Fetches national seats-by-party AND vote shares for all 24 Belgian federal
// Chamber elections (1946-2024) from the official IBZ API.
// The "Country" election-level node carries per-party nrOfSeats + nrOfVotes,
// so both the "API seats" and "API vote share" datasets come from one fetch.
//
// Output: src/lib/data/api-elections.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.electionresults.belgium.be';
const DATES = [
  '1946-02-17','1949-06-26','1950-06-14','1954-04-11','1958-06-01','1961-03-26',
  '1965-05-23','1968-03-31','1971-11-07','1974-03-10','1977-04-17','1978-12-17',
  '1981-11-08','1985-10-13','1987-12-13','1991-11-24','1995-05-21','1999-06-13',
  '2003-05-18','2007-06-10','2010-06-13','2014-05-25','2019-05-26','2024-06-09',
];

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((res) => setTimeout(res, 800 * (i + 1)));
    }
  }
}

async function fetchElection(date) {
  // 1. find the Chamber election id for this date
  const elections = await getJSON(`${API}/election?ElectionDates=${date}`);
  const chamber = elections.find((e) => e.type === 'Chamber');
  if (!chamber) throw new Error(`no Chamber election for ${date}`);

  // 2. list all election levels, find the Country node
  const levels = await getJSON(`${API}/election-level?ElectionId=${chamber.id}&PageSize=3000`);
  const country = levels.find((l) => l.description === 'Country');
  if (!country) throw new Error(`no Country level for ${date}`);

  // 3. fetch Country detail (carries electionLists with per-party seats + votes)
  const detail = await getJSON(`${API}/election-level/${country.id}`);
  const lists = (detail.electionLists || []).map((l) => ({
    partyId: l.partyId,
    partyLabel: l.partyLabel,
    seats: l.nrOfSeats ?? 0,
    votes: l.nrOfVotes ?? 0,
  }));

  const totalSeats = detail.nrOfSeats ?? lists.reduce((s, l) => s + l.seats, 0);
  const totalValidVotes = detail.nrOfValidVotes ?? lists.reduce((s, l) => s + l.votes, 0);

  return {
    date,
    electionId: chamber.id,
    totalSeats,
    totalValidVotes,
    parties: lists
      .filter((l) => l.votes > 0 || l.seats > 0)
      .sort((a, b) => b.seats - a.seats || b.votes - a.votes),
  };
}

const __dir = dirname(fileURLToPath(import.meta.url));
const out = [];
for (const date of DATES) {
  process.stdout.write(`fetching ${date} ... `);
  try {
    const e = await fetchElection(date);
    const seatSum = e.parties.reduce((s, p) => s + p.seats, 0);
    console.log(`OK  total=${e.totalSeats} seatSum=${seatSum} parties=${e.parties.length}` +
      (seatSum !== e.totalSeats ? `  ⚠ SEAT MISMATCH` : ''));
    out.push(e);
  } catch (err) {
    console.log(`FAIL ${err.message}`);
    out.push({ date, error: String(err.message) });
  }
}

const outPath = resolve(__dir, '../src/lib/data/api-elections.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\nwrote ${outPath}`);
