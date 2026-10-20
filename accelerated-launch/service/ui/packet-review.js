'use strict';
// All sheets are rasterized from the same complete PDF. Only letter fields are
// editable here; existing report annotations remain part of the owned packet.
window.CRP_PACKET_REVIEW = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pageLabel = page => ({instructions:'Instructions for you',letter:'Your dispute letter',IDENTITY:'Identification copy',IDENTIFICATION:'Identification copy',ADDRESS:'Address verification copy',SUPPORTING:'Supporting evidence'}[page.label] || {instructions:'Instructions for you',letter:'Your dispute letter'}[page.kind] || page.label || 'Packet page');
  function mount(options) {
    const { root, caseId, version, ensure, request, changed } = options;
    const base = `/api/cases/${encodeURIComponent(caseId)}/packet/preview/pages`, query = '?version=' + encodeURIComponent(version);
    let disposed = false, letterChanged = false, editors = [], annotations = structuredClone(options.annotations || []);
    const live = () => { ensure(); if (disposed || !root.isConnected) throw Object.assign(new Error('Packet view closed.'), {cancelled:true}); };
    const controller = {
      letter: () => {
        if (!letterChanged) return options.letter;
        const text=editors.map(node=>node.value).join('\n');
        if(text.length>24000)throw new Error('Your letter is too long. Shorten it to 24,000 characters, then save again.');
        return text;
      },
      annotations: () => structuredClone(annotations),
      dispose: () => { disposed = true; for (const img of root.querySelectorAll('img')) img.removeAttribute('src'); },
      ready: null
    };
    controller.ready = (async () => {
      const data = await request(base + query); live();
      root.dataset.version = version;
      if (data.preview_version !== version || !Number.isSafeInteger(data.page_count) || data.page_count < 1 || data.page_count > 400 || data.review_pages?.length !== data.page_count) throw new Error('Your packet changed. Save and review it again.');
      root.innerHTML = `<div class="packet-page-toolbar"><strong>${data.page_count} pages in your complete packet</strong><label>Go to page <select id="packet-page-jump">${data.review_pages.map(p => `<option value="${p.page}">${p.page}: ${escape(pageLabel(p))}</option>`).join('')}</select></label><label>Page size <select id="packet-page-zoom"><option value="100">Fit to screen</option><option value="150">150%</option><option value="200">200%</option></select></label><a href="/api/cases/${encodeURIComponent(caseId)}/packet/preview${query}" target="_blank" rel="noopener noreferrer">Open complete PDF</a></div><p class="evidence">Read every page below. Edit the letter on its pages. Save your changes to update the PDF before approval.</p><p id="packet-page-load-status" role="status">Loading page 1 of ${data.page_count}...</p><div class="packet-page-list"></div>`;
      const list = root.querySelector('.packet-page-list');
      for (const meta of data.review_pages) {
        const sheet = document.createElement('section'); sheet.className = 'packet-page'; sheet.id = 'packet-sheet-' + meta.page;
        sheet.dataset.packetPage = meta.page; sheet.setAttribute('aria-label', `Page ${meta.page} of ${data.page_count}: ${pageLabel(meta)}`);
        sheet.innerHTML = `<h4>Page ${meta.page} of ${data.page_count} - ${escape(pageLabel(meta))}${meta.source_page ? ` (${meta.kind.startsWith('report')?'report':'document'} page ${meta.source_page})` : ''}</h4>${meta.kind === 'instructions' ? '<p class="note">For you only. Remove this page before sending.</p>' : ''}<div class="packet-sheet-scroll"><div class="packet-sheet" style="aspect-ratio:${meta.page_width}/${meta.page_height}"><img alt="${escape(pageLabel(meta))} - page ${meta.page}" class="packet-page-image"></div></div>`;
        list.append(sheet);
        if (meta.rendered_as_images) {
          const note = document.createElement('p'); note.className = 'evidence';
          note.textContent = 'This supporting copy is shown as images. Your original upload is unchanged.';
          sheet.insertBefore(note, sheet.querySelector('.packet-sheet-scroll'));
        }
        const paper = sheet.querySelector('.packet-sheet');
        for (const field of (data.editable_fields || []).filter(f => f.page === meta.page && f.section === 'letter')) {
          const editor = document.createElement('textarea'); editor.className = 'packet-page-editor'; editor.dataset.packetLetterPage = meta.page;
          editor.disabled = Boolean(options.letterDisabled?.());
          editor.id = editors.length ? 'packet-letter-' + meta.page : 'packet-letter'; editor.maxLength = 24000; editor.spellcheck = true;
          editor.setAttribute('aria-label', 'Edit your dispute letter, packet page ' + meta.page);
          editor.value = field.text; editor.style.left = 100 * field.x / meta.page_width + '%'; editor.style.top = 100 * field.y / meta.page_height + '%';
          editor.style.width = 100 * field.width / meta.page_width + '%'; editor.style.height = 100 * field.height / meta.page_height + '%';
          editor.style.setProperty('--letter-font', String(field.font_size)); editor.style.setProperty('--page-width', String(meta.page_width));
          editor.oninput = () => { live(); letterChanged = true; changed('letter'); sheet.classList.add('is-edited'); };
          editors.push(editor); paper.append(editor);
        }
      }
      root.querySelector('#packet-page-jump').onchange = event => root.querySelector('#packet-sheet-' + event.target.value)?.scrollIntoView({block:'start',behavior:'instant'});
      root.querySelector('#packet-page-zoom').onchange = event => {for(const paper of root.querySelectorAll('.packet-sheet'))paper.style.width=event.target.value+'%';};
      for (const meta of data.review_pages) {
        live();
        const img = root.querySelector('#packet-sheet-' + meta.page + ' img');
        await new Promise((resolve,reject) => {img.onload=resolve;img.onerror=()=>reject(new Error('We could not show this packet page.'));img.src=base+'/'+meta.page+query;}); live();
        root.querySelector('#packet-page-load-status').textContent = meta.page === data.page_count ? `All ${data.page_count} pages are ready to review.` : `Loading page ${meta.page+1} of ${data.page_count}...`;
      }
      return data;
    })();
    return controller;
  }
  return { mount };
})();
