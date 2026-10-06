'use strict';
/**
 * probe_corpus_001u.cjs — a throw-away reader used while executing PHASE5-001U.
 *
 * It prints the register row the admitted rule unit binds to, the counts the register and the coverage summary
 * carry, and the crosswalk entry the rule unit is bound to, so the counts record can be authored from measurement.
 * It writes nothing and decides nothing.
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib_001u.cjs');

const csv = fs.readFileSync(lib.abs(lib.PATHS.rescreen_register), 'utf8');
const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
const unquote = (s) => s.replace(/^"/, '').replace(/"$/, '');
const header = unquote(lines[0]).split('","');
const body = lines.slice(1).map((l) => unquote(l).split('","'));

const tally = {};
const states = {};
const blockerTypes = {};
body.forEach((cells) => {
  const d = cells[header.indexOf('disposition')];
  tally[d] = (tally[d] || 0) + 1;
  const s = cells[header.indexOf('disposition_state')];
  states[s] = (states[s] || 0) + 1;
  const b = cells[header.indexOf('blocker_type')];
  blockerTypes[b] = (blockerTypes[b] || 0) + 1;
});

const want = ['CRP-LSRC-0354', 'CRP-LSRC-0001', 'CRP-LSRC-0437'];
const rows = body.filter((cells) => want.indexOf(cells[0]) >= 0).map((cells) => {
  const o = {};
  ['source_entry_id', 'record_type', 'legal_family', 'canonical_country_code', 'canonical_region_code',
    'provision_or_citation', 'canonical_entry_id', 'duplicate_group_id', 'disposition', 'disposition_state',
    'blocker_type'].forEach((h) => { o[h] = cells[header.indexOf(h)]; });
  return o;
});

const crosswalk = lib.readJson(lib.PATHS.crosswalk);
const cwKeys = Object.keys(crosswalk);
const cwHits = [];
function walk(node, trail) {
  if (node === null || typeof node !== 'object') {
    if (typeof node === 'string' && node.indexOf('CA-NS-CRA-S10-3-C-LIMB-1') >= 0) cwHits.push(trail);
    return;
  }
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, trail + '[' + i + ']')); return; }
  Object.keys(node).forEach((k) => walk(node[k], trail + '.' + k));
}
walk(crosswalk, '');
const cwTrail = cwHits.find((t) => /entry|rule|unit/i.test(t)) || cwHits[0] || null;
const cwEntry = cwTrail ? cwTrail.replace(/^\.[^.]+\.?/, '').split('.')[0] : null;
let bound = null;
if (cwTrail) {
  const arr = crosswalk[cwKeys[0]];
  bound = null;
}
// Print the crosswalk record that carries the unit id, whatever its shape.
function findCarrier(node, trail, depth) {
  if (depth > 6 || node === null || typeof node !== 'object') return null;
  if (!Array.isArray(node) && typeof node === 'object') {
    const flat = JSON.stringify(node);
    if (flat.indexOf('CA-NS-CRA-S10-3-C-LIMB-1') >= 0 && flat.length < 4000) return { trail: trail, node: node };
  }
  const kids = Array.isArray(node) ? node.map((v, i) => [String(i), v]) : Object.keys(node).map((k) => [k, node[k]]);
  for (const [k, v] of kids) {
    const hit = findCarrier(v, trail + (Array.isArray(node) ? '[' + k + ']' : '.' + k), depth + 1);
    if (hit) return hit;
  }
  return null;
}
const carrier = findCarrier(crosswalk, '', 0);

console.log(JSON.stringify({
  register: {
    rows: body.length,
    columns: header.length,
    disposition_tally: tally,
    disposition_state_tally: states,
    blocker_type_tally: blockerTypes,
  },
  register_rows_of_interest: rows,
  crosswalk_top_level_keys: cwKeys,
  crosswalk_unit_id_hits: cwHits.length,
  crosswalk_carrier_trail: carrier ? carrier.trail : null,
  crosswalk_carrier: carrier ? carrier.node : null,
}, null, 1));
