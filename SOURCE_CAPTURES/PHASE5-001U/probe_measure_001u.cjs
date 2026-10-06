'use strict';
/**
 * probe_measure_001u.cjs — a throw-away reader used while executing PHASE5-001U.
 *
 * It calls the authored re-measurement module and prints the four clause states, the tally, the problems and the
 * summary numbers, so the run can be inspected before anything is written. It writes nothing and decides nothing.
 */
const g = require('./gate56_001u.cjs');
const m = g.measure();
const byN = {};
m.gate_criteria.forEach((c) => { byN[c.n] = c; });
console.log(JSON.stringify({
  every_clause_met: m.every_clause_met,
  gate_tally: m.gate_tally,
  clause_states: m.gate_criteria.map((c) => c.n + ': ' + c.state),
  clause_failures: m.gate_criteria.map((c) => ({ n: c.n, failures_found_here: c.failures_found_here })),
  problems_found_in_this_re_measurement: m.problems_found_in_this_re_measurement,
  summary_numbers: m.summary_numbers,
  clause4_measurement: (byN[4] || {}).measurement,
  clause4_how_the_identity_is_carried: (byN[4] || {}).how_the_identity_is_carried,
  predecessor: m.predecessor_verdict,
}, null, 1));
