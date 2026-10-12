'use strict';

/* Complete printed money readings only. Dates, embedded text and broken grouping
   cannot become a zero or a positive balance; credit balances retain their sign. */
function printedAmount(raw, { allowAsOf = false } = {}) {
  if (raw == null) return null;
  let text = String(raw).trim();
  const currencies=[...text.matchAll(/\b(?:CAD|USD|GBP|AUD)\b/gi)].map(match=>match[0].toUpperCase());
  if(new Set(currencies).size>1)return null;
  const outerParentheses=/^\((.*)\)$/.exec(text);
  if(outerParentheses)text=outerParentheses[1].trim();
  text = text.replace(/^−/, '-');
  if (allowAsOf) text = text.replace(/\s+as\s+of\s+\d{1,2}\/\d{1,2}\/\d{4}\s*$/i, '').trim();
  // Bureau disclosures commonly print an explicit currency after the amount.
  // Accept only known report currencies and only when the remainder is one complete amount.
  text = text.replace(/\s+(?:CAD|USD|GBP|AUD)\s*$/i, '').trim();
  text = text.replace(/^(?:CAD|USD|GBP|AUD)\s+/i, '').trim();
  const parentheses = outerParentheses || /^\((.*)\)$/.exec(text);
  if (parentheses && !outerParentheses) text = parentheses[1].trim();
  const match = /^([+-]?)\s*(?:[$£€]\s*)?([+-]?)\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)$/.exec(text);
  if (!match || match[1] && match[2] || parentheses && (match[1] || match[2])) return null;
  const sign = parentheses || (match[1] || match[2]) === '-' ? -1 : 1;
  const value = sign * Number(match[3].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

module.exports = { printedAmount };
