'use strict';
document.getElementById('copyLink').addEventListener('click', async event => {
  try {
    await navigator.clipboard.writeText(document.getElementById('referralLink').textContent);
    event.currentTarget.textContent = 'Copied';
  } catch {
    event.currentTarget.textContent = 'Select link to copy';
  }
});
