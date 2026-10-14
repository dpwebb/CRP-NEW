'use strict';
(() => {
  const $ = id => document.getElementById(id);
  let current = null, organization = null;
  const message = (text, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };
  async function api(url, method = 'GET', body) {
    const response = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let data; try { data = await response.json(); } catch { throw Error('The service could not be reached. Try again.'); }
    if (!response.ok) { const error = Error(data.error?.message || 'Access could not be updated. Refresh and try again.'); error.code = data.error?.code; throw error; }
    return data;
  }
  async function busy(button, work) { button.disabled = true; try { await work(); } catch (error) { message(error.message, true); if (error.code === 'AUTHENTICATION_REQUIRED') signedOut(); } finally { button.disabled = false; } }
  function signedOut() { current = null; organization = null; $('signin-panel').hidden = false; $('access-panel').hidden = true; $('password').value = ''; $('code').value = ''; }
  async function load() {
    await api('/api/session');
    const data = await api('/api/cases');
    $('case').replaceChildren(new Option('Choose your report', ''));
    for (const item of data.cases || []) $('case').add(new Option(`${item.country} · ${item.region} · ${item.selected_bureau || 'Report'} · ${item.case_id.slice(0, 8)}`, item.case_id));
    const requested = new URLSearchParams(location.search).get('case');
    if (requested && [...$('case').options].some(option => option.value === requested)) $('case').value = requested;
    $('signin-panel').hidden = true; $('access-panel').hidden = false;
    if (!(data.cases || []).length) message('You have no reports yet. Return to your reports to prepare a packet.');
  }
  function resetReview() { current = null; organization = null; $('review').hidden = true; $('grants-panel').hidden = true; $('grants').replaceChildren(); $('consent').checked = false; $('preview').hidden = true; $('preview').removeAttribute('href'); }
  async function review() {
    resetReview();
    const caseId = $('case').value, orgId = $('organization').value.trim();
    if (!caseId || !orgId) throw Error('Choose your report and enter the organization reference.');
    const [orgData, grants] = await Promise.all([api('/api/fulfillment-organizations/' + encodeURIComponent(orgId)), api('/api/cases/' + encodeURIComponent(caseId) + '/fulfillment-grants')]);
    organization = orgData.organization || orgData;
    const approval = grants.current_approval || {};
    current = { caseId, orgId, approval };
    $('organization-name').textContent = organization.name || organization.organization_name || 'Selected organization';
    const approved = approval.approved && !approval.approval_stale && approval.approved_version && approval.pdf_sha256;
    $('packet-status').textContent = approved ? 'This organization will be allowed to read only the exact packet you have approved for this report.' : 'Prepare, review and approve the current packet in your reports before granting access.';
    $('grant-form').hidden = !approved;
    if (approved) { $('preview').href = '/api/cases/' + encodeURIComponent(caseId) + '/packet-download'; $('preview').hidden = false; }
    $('review').hidden = false; $('grants-panel').hidden = false;
    const items = grants.items || [];
    if (!items.length) { const li = document.createElement('li'); li.textContent = 'No organization has been granted access to this report.'; $('grants').append(li); }
    for (const grant of items) {
      const li = document.createElement('li'), label = document.createElement('p');
      label.textContent = `${grant.organization_name || grant.org_id} · ${grant.status || (grant.revoked_at ? 'REVOKED' : 'ACTIVE')}`; li.append(label);
      if (!grant.revoked_at && grant.status !== 'REVOKED') { const revoke = document.createElement('button'); revoke.type = 'button'; revoke.className = 'secondary'; revoke.textContent = 'Revoke access'; revoke.addEventListener('click', () => busy(revoke, async () => { await api('/api/cases/' + encodeURIComponent(caseId) + '/fulfillment-grants/' + encodeURIComponent(grant.grant_id), 'DELETE', {}); await review(); message('Partner access revoked. Previously downloaded copies cannot be recalled.'); })); li.append(revoke); }
      $('grants').append(li);
    }
    message('Review the organization and packet before allowing access.');
  }
  $('organization').value = (new URLSearchParams(location.search).get('organization') || '').slice(0, 80);
  $('signin-form').addEventListener('submit', event => { event.preventDefault(); busy(event.submitter, async () => { await api('/api/sessions', 'POST', { email: $('email').value, password: $('password').value, code: $('code').value || undefined }); $('password').value = ''; $('code').value = ''; await load(); message('Signed in. Choose the report you want to share.'); }); });
  $('choose-form').addEventListener('submit', event => { event.preventDefault(); busy(event.submitter, review); });
  for (const id of ['case', 'organization']) $(id).addEventListener('change', resetReview);
  $('grant-form').addEventListener('submit', event => { event.preventDefault(); busy(event.submitter, async () => { if (!current || !$('consent').checked) throw Error('Review the packet and confirm your choice first.'); await api('/api/cases/' + encodeURIComponent(current.caseId) + '/fulfillment-grants', 'POST', { org_id: current.orgId, approved_version: current.approval.approved_version, pdf_sha256: current.approval.pdf_sha256 }); await review(); message('Access allowed for this approved packet. You can revoke it below.'); }); });
  $('signout').addEventListener('click', () => busy($('signout'), async () => { await api('/api/sessions/current', 'DELETE', {}); resetReview(); signedOut(); message('Signed out.'); }));
  load().catch(error => { signedOut(); if (error.code !== 'AUTHENTICATION_REQUIRED') message(error.message, true); });
})();
