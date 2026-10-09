'use strict';
const byId = id => document.getElementById(id);
const status = message => { byId('status').textContent = message; };
const money = (minor, currency) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100);
async function call(method, path, body) {
  const response = await fetch(path, { method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 401 ? 'Sign in to CRP first.' :
    data.error?.message || 'The referral request could not be completed.');
  return data;
}
async function refresh() {
  try {
    const { referral } = await call('GET', '/api/referrals');
    byId('enrollCard').hidden = referral.enrolled;
    byId('memberCard').hidden = !referral.enrolled;
    byId('rewardsCard').hidden = !referral.enrolled;
    if (referral.enrolled) {
      byId('code').textContent = referral.code;
      const target = byId('rewards');
      target.replaceChildren();
      for (const tranche of referral.tranches) {
        const row = document.createElement('div'); row.className = 'reward';
        const description = document.createElement('span');
        description.textContent = `Level ${tranche.level} · ${tranche.kind === 'INITIAL' ? 'Friday portion' : '180-day reserve'}`;
        const detail = document.createElement('small');
        detail.textContent = `${tranche.status} · scheduled ${new Date(tranche.due_at).toLocaleDateString()}`;
        description.append(detail);
        const amount = document.createElement('strong'); amount.textContent = money(tranche.amount_minor, tranche.currency);
        row.append(description, amount); target.append(row);
      }
      if (!referral.tranches.length) target.textContent = 'No reward activity yet.';
    }
    status('Your staging referral workspace is ready.');
  } catch (error) { status(error.message); }
}
byId('enrollForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { await call('POST', '/api/referrals/enroll', { introducer_code: byId('introducer').value.trim() || null });
    await refresh(); } catch (error) { status(error.message); }
});
byId('attributeForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { await call('POST', '/api/referrals/attribute', { referrer_code: byId('referrer').value.trim() });
    status('Referral saved for your first eligible purchase.'); } catch (error) { status(error.message); }
});
refresh();
