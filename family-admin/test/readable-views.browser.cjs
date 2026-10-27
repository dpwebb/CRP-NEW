// Playwright CLI run-code --filename family-admin/test/readable-views.browser.cjs
// Uses only readable-views-demo.mjs and its isolated fictional local servers.
async (page) => {
  if (new URL(page.url()).origin !== 'http://127.0.0.1:4498') throw Error('LOCAL_DEMO_REQUIRED');
  const check = (condition, message) => { if (!condition) throw Error(message); };
  if (await page.getByRole('textbox', {name: 'Email address'}).isVisible()) {
  await page.getByRole('textbox', {name: 'Email address'}).fill('owner@example.test');
  await page.getByRole('textbox', {name: 'Password', exact: true}).fill('fictional-password');
  await page.getByRole('textbox', {name: 'Authenticator code', exact: true}).fill('123456');
  await page.getByRole('button', {name: 'Continue securely'}).click();
  await page.getByRole('textbox', {name: 'Fresh authenticator code'}).fill('654321');
  await page.getByRole('button', {name: 'Unlock administration', exact: true}).click();
  }
  await page.locator('#workspace').waitFor({state: 'visible'});
  if (await page.locator('dialog[open]').count()) await page.locator('#dialog-cancel').click();
  const views = await page.evaluate(() => Object.entries(pages).filter(([,p]) => p.app && p.resource).map(([id,p]) => ({id, ...p})));
  const results = [];
  for (const spec of views) {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/apps/' + spec.app + '/' + spec.resource);
    await page.locator('nav a[href="#' + spec.id + '"]').click();
    check((await response).ok(), spec.id + ': failed fixture response');
    await page.locator('#content[aria-busy="false"]').waitFor();
    const view = page.locator('main').getByRole('button', {name: 'View', exact: true}).first();
    if (await view.count()) {
      await view.click();
      await page.locator('dialog[open] .record-details').first().waitFor();
      check(await page.locator('dialog[open] dt').count() > 0, spec.id + ': missing labelled fields');
      check(await page.locator('dialog[open] pre').count() === 0, spec.id + ': raw JSON');
      if (['orders', 'proposals'].includes(spec.id)) {
        const previousDetails = await page.locator('dialog[open] .record-details').first().elementHandle();
        await page.getByRole('button', {name: spec.id === 'orders' ? 'Open full order' : 'Review payout export', exact: true}).click();
        await previousDetails.waitForElementState('hidden');
        await page.locator('dialog[open] .record-details').first().waitFor();
        check(await page.locator('dialog[open] dt').count() > 0 && await page.locator('dialog[open] pre').count() === 0, spec.id + ': expanded details');
      }
      if (spec.id === 'tickets') {
        const dialog = page.locator('dialog[open]');
        check((await dialog.innerText()).includes('Resolved'), 'ticket status is readable');
        check((await dialog.innerText()).includes('Manually reviewed'), 'review label');
        check((await dialog.innerText()).includes('Not provided'), 'missing value');
        check(await dialog.locator('time').count() === 2, 'formatted dates');
        check(await dialog.locator('details:not([open])').count() > 0, 'technical references start collapsed');
        await page.screenshot({path: 'output/playwright/admin-ticket-desktop.png'});
      }
      await page.locator('#dialog-cancel').click();
    } else {
      check(await page.locator('#content .record-details, #content .empty').count() > 0, spec.id + ': summary missing readable details or empty state');
    }
    check(await page.locator('#content pre').count() === 0, spec.id + ': summary contains JSON');
    results.push(spec.id);
  }
  // Test untrusted text and uncommon value shapes using the same real DOM renderer.
  const safety = await page.evaluate(() => {
    const item = { note: '<img src=x onerror="window.injected=true">', currency: 'USD', amount_minor: 12345,
      active: false, count: 0, empty: [], missing: null, id: 1234567, nested: { items: [{ name: 'Nested item' }] } };
    const before = JSON.stringify(item), rendered = recordDetails(item);
    return { unchanged: JSON.stringify(item) === before, images: rendered.querySelectorAll('img').length,
      text: rendered.textContent, refs: rendered.querySelector('details').textContent };
  });
  check(safety.unchanged && safety.images === 0, 'renderer must preserve data and escape HTML');
  check(safety.text.includes('$123.45') && safety.text.includes('No') && safety.text.includes('No items.') && safety.text.includes('Not provided') && safety.text.includes('Nested item'), 'nested values and currency');
  check(safety.refs.includes('1234567') && !safety.refs.includes('1,234,567'), 'reference bytes preserved');
  await page.locator('nav a[href="#tickets"]').click();
  await page.locator('main').getByRole('button', {name: 'View', exact:true}).first().click();
  await page.setViewportSize({width: 390, height: 844});
  check(await page.locator('dialog[open]').evaluate(d => d.scrollWidth <= d.clientWidth), 'mobile dialog overflow');
  await page.screenshot({path: 'output/playwright/admin-ticket-mobile.png'});
  await page.locator('dialog[open] summary').click();
  check(await page.locator('dialog[open] details[open]').count() > 0, 'references expand');
  await page.locator('#dialog-cancel').click();
  await page.getByRole('button', {name:'Sign out', exact:true}).click();
  return {passed: true, views: results, safety: true, mobileWidth: 390};
}
