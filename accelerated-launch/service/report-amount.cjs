'use strict';

/* Complete printed money readings only. Dates, embedded text and broken grouping
   cannot become a zero or a positive balance; credit balances retain their sign. */
function printedAmount(raw, { allowAsOf = false } = {}) {
  if (raw == null) return null;
  let text = String(raw).trim();
  text = text.replace(/^−/, '-');
  if (allowAsOf) text = text.replace(/\s+as\s+of\s+\d{1,2}\/\d{1,2}\/\d{4}\s*$/i, '').trim();
  const parentheses = /^\((.*)\)$/.exec(text);
  if (parentheses) text = parentheses[1].trim();
  const match = /^([+-]?)\s*(?:[$£€]\s*)?([+-]?)\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)$/.exec(text);
  if (!match || match[1] && match[2] || parentheses && (match[1] || match[2])) return null;
  const sign = parentheses || (match[1] || match[2]) === '-' ? -1 : 1;
  const value = sign * Number(match[3].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

module.exports = { printedAmount };
