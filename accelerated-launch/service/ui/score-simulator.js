"use strict";

// Fictional, transparent research proxy. These coefficients are illustrative,
// not learned from bureau data and not estimates of a real scoring formula.
const BASELINE = 690;
const FICTIONAL = { revolvingLimit: 10000, revolvingBalance: 2800 };

const scenarios = [
  { id: "newCard", group: "accounts", label: "Open a new credit card", fields: [
    { name: "limit", label: "New card limit ($)", type: "number", min: 100, max: 100000, value: 3000 }
  ] },
  { id: "newLoan", group: "accounts", label: "Add a new loan", fields: [
    { name: "kind", label: "Loan type", type: "select", options: ["Mortgage", "Auto", "Personal"] },
    { name: "amount", label: "New loan amount ($)", type: "number", min: 100, max: 1000000, value: 10000 }
  ] },
  { id: "inquiries", group: "accounts", label: "Add credit inquiries", fields: [
    { name: "count", label: "Number of hard inquiries", type: "number", min: 1, max: 10, value: 1 }
  ] },
  { id: "publicRecord", group: "accounts", label: "Add a public record", fields: [
    { name: "kind", label: "Record type", type: "select", options: ["Tax lien", "Wage garnishment", "Foreclosure", "Child support"] }
  ] },
  { id: "closeOldest", group: "accounts", label: "Close your oldest account", fields: [] },
  { id: "balance", group: "utilization", label: "Change your total revolving account balances", fields: [
    { name: "direction", label: "Change", type: "select", options: ["Lower", "Raise"] },
    { name: "target", label: "Proposed total balance ($)", type: "number", min: 0, max: 100000, value: 2300 }
  ] },
  { id: "limitIncrease", group: "utilization", label: "Get a credit limit increase", fields: [
    { name: "amount", label: "Increase ($)", type: "number", min: 100, max: 100000, value: 2000 }
  ] },
  { id: "transfer", group: "utilization", label: "Transfer balances to a low interest card", fields: [
    { name: "amount", label: "Transfer amount ($)", type: "number", min: 1, max: 100000, value: 500 }
  ] },
  { id: "onTime", group: "habits", label: "Pay my bills on time", fields: [
    { name: "months", label: "Months paid on time", type: "number", min: 1, max: 24, value: 6 }
  ] },
  { id: "delinquent", group: "habits", label: "Allow monthly accounts to be delinquent", fields: [
    { name: "accounts", label: "Accounts affected", type: "select", options: ["One account", "All accounts"] },
    { name: "days", label: "Days late", type: "select", options: ["30", "60", "90"] }
  ] },
  { id: "collections", group: "habits", label: "Have an account sent to collections", fields: [] },
  { id: "payCards", group: "habits", label: "Pay off all credit cards", fields: [] }
];

const form = document.querySelector("#simulator");
const error = document.querySelector("#error");
const summary = document.querySelector("#summary");
const simulated = document.querySelector("#simulated");
const difference = document.querySelector("#difference");

function renderField(scenario, field) {
  const id = `${scenario.id}-${field.name}`;
  const input = field.type === "select"
    ? `<select id="${id}" name="${id}">${field.options.map(option => `<option value="${option}">${option}</option>`).join("")}</select>`
    : `<input id="${id}" name="${id}" type="number" inputmode="decimal" min="${field.min}" max="${field.max}" step="1" value="${field.value}">`;
  return `<label class="field" for="${id}">${field.label}${input}</label>`;
}

for (const scenario of scenarios) {
  const holder = document.querySelector(`#${scenario.group}-options`);
  const row = document.createElement("div");
  row.className = "option";
  row.innerHTML = `<label class="toggle"><input type="checkbox" name="${scenario.id}" id="${scenario.id}"><span>${scenario.label}</span></label>` +
    (scenario.fields.length ? `<div class="fields" id="${scenario.id}-fields" hidden>${scenario.id === "balance" ? `<div class="field"><span>Fictional current limit</span><strong>$${FICTIONAL.revolvingLimit.toLocaleString()}</strong><span>Fictional current balance</span><strong>$${FICTIONAL.revolvingBalance.toLocaleString()}</strong></div>` : ""}${scenario.fields.map(field => renderField(scenario, field)).join("")}</div>` : "");
  holder.append(row);
  row.querySelector("input[type=checkbox]").addEventListener("change", event => {
    const fields = row.querySelector(".fields");
    if (fields) fields.hidden = !event.target.checked;
    clearResult();
  });
}

function clearResult() {
  simulated.textContent = "—";
  difference.textContent = "Select a scenario to compare.";
  summary.replaceChildren();
  error.textContent = "";
}

function readScenario(scenario) {
  if (!document.getElementById(scenario.id).checked) return null;
  const values = {};
  for (const field of scenario.fields) {
    const control = document.getElementById(`${scenario.id}-${field.name}`);
    if (field.type === "number") {
      const value = Number(control.value);
      if (!Number.isFinite(value) || !Number.isInteger(value) || value < field.min || value > field.max || control.value.trim() === "") {
        throw new Error(`${scenario.label}: enter a whole number from ${field.min.toLocaleString()} to ${field.max.toLocaleString()}.`);
      }
      values[field.name] = value;
    } else {
      values[field.name] = control.value;
    }
  }
  return values;
}

function validate(selection) {
  if (!Object.keys(selection).length) throw new Error("Select at least one scenario.");
  if (selection.onTime && selection.delinquent) throw new Error("Choose either on-time payments or delinquency for this comparison.");
  if (selection.payCards && selection.balance) throw new Error("Choose either a proposed balance or paying off all cards.");
  if (selection.balance?.direction === "Lower" && selection.balance.target >= FICTIONAL.revolvingBalance) throw new Error("A lower proposed balance must be below the fictional current balance.");
  if (selection.balance?.direction === "Raise" && selection.balance.target <= FICTIONAL.revolvingBalance) throw new Error("A higher proposed balance must exceed the fictional current balance.");
  if (selection.transfer && selection.transfer.amount > FICTIONAL.revolvingBalance) throw new Error("The transfer exceeds the fictional starting balance.");
}

function utilizationEffect(beforeBalance, beforeLimit, afterBalance, afterLimit) {
  // The proxy uses 90 points per unit of utilization change. This has no
  // empirical interpretation as an actual credit-score point change.
  return Math.round(90 * (beforeBalance / beforeLimit - afterBalance / afterLimit));
}

function calculateProxy(selection) {
  let balance = FICTIONAL.revolvingBalance;
  let limit = FICTIONAL.revolvingLimit;
  const effects = [];
  const add = (label, points) => effects.push({ label, points });

  if (selection.balance) {
    balance = selection.balance.target;
    add(`Proposed revolving balance: $${selection.balance.target.toLocaleString()}`, 0);
  }
  if (selection.payCards) { balance = 0; add("Credit card balances paid off", 0); }
  if (selection.newCard) { limit += selection.newCard.limit; add(`New card with $${selection.newCard.limit.toLocaleString()} limit`, -9); }
  if (selection.limitIncrease) { limit += selection.limitIncrease.amount; add(`Credit limit raised by $${selection.limitIncrease.amount.toLocaleString()}`, 0); }
  if (selection.transfer) add(`$${selection.transfer.amount.toLocaleString()} balance transferred; total debt unchanged`, -2);
  if (balance > limit) throw new Error("The hypothetical revolving balance exceeds the hypothetical limit.");
  const utilizationPoints = utilizationEffect(FICTIONAL.revolvingBalance, FICTIONAL.revolvingLimit, balance, limit);
  if (balance !== FICTIONAL.revolvingBalance || limit !== FICTIONAL.revolvingLimit) {
    add(`Utilization: ${(100 * FICTIONAL.revolvingBalance / FICTIONAL.revolvingLimit).toFixed(1)}% → ${(100 * balance / limit).toFixed(1)}%`, utilizationPoints);
  }

  if (selection.newLoan) add(`${selection.newLoan.kind} loan added`, -7);
  if (selection.inquiries) add(`${selection.inquiries.count} new hard ${selection.inquiries.count === 1 ? "inquiry" : "inquiries"}`, -3 * selection.inquiries.count);
  if (selection.publicRecord) add(`${selection.publicRecord.kind} public-record scenario`, -42);
  if (selection.closeOldest) add("Oldest account closed", -18);
  if (selection.onTime) add(`${selection.onTime.months} months of on-time payments`, Math.min(18, Math.round(selection.onTime.months * 0.75)));
  if (selection.delinquent) {
    const severity = { "30": 25, "60": 40, "90": 55 }[selection.delinquent.days];
    const multiplier = selection.delinquent.accounts === "All accounts" ? 2 : 1;
    add(`${selection.delinquent.accounts} ${selection.delinquent.days} days late`, -severity * multiplier);
  }
  if (selection.collections) add("Account sent to collections", -48);

  const raw = BASELINE + effects.reduce((total, effect) => total + effect.points, 0);
  return { score: Math.min(900, Math.max(300, raw)), effects };
}

form.addEventListener("submit", event => {
  event.preventDefault();
  clearResult();
  try {
    const selection = {};
    for (const scenario of scenarios) {
      const values = readScenario(scenario);
      if (values) selection[scenario.id] = values;
    }
    validate(selection);
    const result = calculateProxy(selection);
    simulated.textContent = String(result.score);
    const delta = result.score - BASELINE;
    difference.textContent = `${delta > 0 ? "+" : ""}${delta} proxy points in this fictional scenario`;
    const list = document.createElement("ul");
    for (const effect of result.effects) {
      const item = document.createElement("li");
      item.textContent = `${effect.label}: ${effect.points > 0 ? "+" : ""}${effect.points} proxy points`;
      list.append(item);
    }
    summary.replaceChildren(list);
  } catch (problem) {
    error.textContent = problem.message;
  }
});

document.getElementById("reset").addEventListener("click", () => {
  form.reset();
  document.querySelectorAll(".fields").forEach(fields => { fields.hidden = true; });
  clearResult();
});
