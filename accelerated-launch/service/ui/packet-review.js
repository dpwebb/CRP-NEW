'use strict';
// All sheets are rasterized from the same complete PDF. Only letter fields are
// editable here; existing report annotations remain part of the owned packet.
window.CRP_PACKET_REVIEW = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pageLabel = page => page.grouped_identification ? 'Identification copies' : ({instructions:'Instructions for you',letter:'Your dispute letter',IDENTITY:'Identification copy',IDENTIFICATION:'Identification copy',ADDRESS:'Address verification copy',SUPPORTING:'Supporting evidence'}[page.label] || {instructions:'Instructions for you',letter:'Your dispute letter'}[page.kind] || page.label || 'Packet page');
  function mount(options) {
    const { root, caseId, version, ensure, request, changed } = options;
    const base = `/api/cases/${encodeURIComponent(caseId)}/packet/preview/pages`, query = '?version=' + encodeURIComponent(version);
    let disposed = false, letterChanged = false, editors = [], annotations = structuredClone(options.annotations || []);
    let reading = null, readingRequested = false, readingLoading = false, readingEditors = [];
    const live = () => { ensure(); if (disposed || !root.isConnected) throw Object.assign(new Error('Packet view closed.'), {cancelled:true}); };
    const controller = {
      letter: () => {
        if (!letterChanged) return options.letter;
        const text=editors.map(node=>node.value).join('\n');
        if(text.length>24000)throw new Error('Your letter is too long. Shorten it to 24,000 characters, then save again.');
        return text;
      },
      annotations: () => structuredClone(annotations),
      readingApproval: () => {
        if (!readingRequested) return undefined;
        if (!reading?.complete || readingEditors.some(editor => editor.node.value !== editor.saved)) throw new Error('Finish and save the text alternatives, then review this packet again before approving.');
        return reading.reading_sha256;
      },
      dispose: () => { disposed = true; for (const img of root.querySelectorAll('img')) img.removeAttribute('src'); },
      ready: null
    };
    controller.ready = (async () => {
      const data = await request(base + query); live();
      root.dataset.version = version;
      if (data.preview_version !== version || !Number.isSafeInteger(data.page_count) || data.page_count < 1 || data.page_count > 400 || data.review_pages?.length !== data.page_count) throw new Error('Your packet changed. Save and review it again.');
      root.innerHTML = `<h2 class="packet-preview-heading">Complete packet preview</h2><div class="packet-page-toolbar"><strong>${data.page_count} pages in your complete packet</strong><label>Go to page <select id="packet-page-jump">${data.review_pages.map(p => `<option value="${p.page}">${p.page}: ${escape(pageLabel(p))}</option>`).join('')}</select></label><label>Page size <select id="packet-page-zoom"><option value="100">Fit to screen</option><option value="readable">Full size for reading</option><option value="150">150%</option><option value="200">200%</option></select></label><a href="/api/cases/${encodeURIComponent(caseId)}/packet/preview${query}" target="_blank" rel="noopener noreferrer">Open complete PDF to zoom or read</a></div><p class="evidence">Read every page below. Edit the letter on its pages. Save your changes to update the PDF before approval.</p><p id="packet-page-load-status" role="status">Loading page 1 of ${data.page_count}...</p><div class="packet-page-list"></div>`;
      const list = root.querySelector('.packet-page-list');
      const readingPanel = document.createElement('details'); readingPanel.className = 'packet-text-reading';
      readingPanel.innerHTML = '<summary>Read packet as text</summary><h3>Packet text reading</h3><p role="status">Open this section to load the text for every packet page.</p><div class="packet-text-content"></div>';
      root.insertBefore(readingPanel, list);
      readingPanel.ontoggle = async () => {
        if (!readingPanel.open) return;
        readingRequested = true;
        if (reading || readingLoading) return;
        readingLoading = true;
        const status = readingPanel.querySelector('[role="status"]'), content = readingPanel.querySelector('.packet-text-content');
        content.replaceChildren(); readingEditors = [];
        try {
          const answer = await request(`/api/cases/${encodeURIComponent(caseId)}/packet/reading${query}`); live();
          reading = answer.reading;
          if (reading.packet_version !== version || reading.page_count !== data.page_count || reading.pages?.length !== data.page_count) throw new Error('Your packet changed. Save and review again.');
          status.textContent = reading.complete ? 'Every page has generated text or a confirmed alternative. Read every page before approving.' : 'Some attachment text is not confirmed. Add or check the full text alternative for every attachment below, then save it. This reading is incomplete until then.';
          const explanation = document.createElement('p'); explanation.textContent = 'The PDF and original uploads stay unchanged. Extracted text can miss images, layout or details. A confirmed alternative must describe all meaningful content, including any images. Alternatives are consumer-supplied, not verified report facts.'; content.append(explanation);
          for (const page of reading.pages) {
            const section = document.createElement('section'), title = document.createElement('h4');
            title.textContent = `Page ${page.page} of ${reading.page_count}: ${pageLabel(page)}`; section.append(title);
            if (page.kind === 'instructions') {const note=document.createElement('p');note.textContent='For you only. Remove this page before mailing.';section.append(note);}
            if (['letter','instructions'].includes(page.kind)) {const text=document.createElement('pre');text.textContent=page.text;section.append(text);}
            else {
              const label=document.createElement('label'), editor=document.createElement('textarea'), source=document.createElement('p');
              editor.id='packet-text-page-'+page.page;editor.rows=8;editor.maxLength=24000;editor.value=page.text;
              label.htmlFor=editor.id;label.textContent='Complete text alternative for packet page '+page.page;
              source.textContent=page.confirmed?'Saved consumer-confirmed alternative.':'Unverified extracted text. Missing or image-only content must be described before confirmation.';
              section.append(source,label,editor);readingEditors.push({node:editor,saved:page.text,page:page.page});
            }
            if (page.notes.length) {const heading=document.createElement('h5'), notes=document.createElement('ul');heading.textContent='Review notes, separate from the original';for(const note of page.notes){const item=document.createElement('li');item.textContent=note.text;notes.append(item);}section.append(heading,notes);}
            content.append(section);
          }
          const confirmLabel=document.createElement('label'), confirm=document.createElement('input');confirm.type='checkbox';
          confirmLabel.append(confirm,document.createTextNode(' I confirm that every attachment alternative includes its meaningful text and image content.'));
          const save=document.createElement('button');save.type='button';save.className='secondary';save.textContent='Save confirmed text alternatives';
          save.onclick=async()=>{
            live();
            if(!confirm.checked||readingEditors.some(editor=>!editor.node.value.trim())){status.textContent='Complete every attachment alternative and check the confirmation before saving.';confirm.focus();return;}
            if(!options.saveReading){status.textContent='Saving text alternatives is unavailable. Your packet is unchanged.';return;}
            await options.saveReading({pdf_sha256:reading.pdf_sha256,confirmed:true,pages:readingEditors.map(editor=>({page:editor.page,text:editor.node.value}))});
          };
          const approvedReading=reading.complete&&options.approvedReading===reading.reading_sha256;
          const link=document.createElement('a');link.href=`/api/cases/${encodeURIComponent(caseId)}/packet/reading.html${query}${approvedReading?'&approved=1':''}`;link.target='_blank';link.rel='noopener noreferrer';link.textContent=approvedReading?'Open approved packet as text':'Open this review version as a text page';
          content.append(confirmLabel,save,link);
        } catch(error) {reading=null;if(!disposed&&root.isConnected)status.textContent=error.message||'Text reading could not be loaded. Close and reopen this section to retry.';}
        finally {readingLoading=false;}
      };
      for (const meta of data.review_pages) {
        const sheet = document.createElement('section'); sheet.className = 'packet-page'; sheet.id = 'packet-sheet-' + meta.page;
        sheet.dataset.packetPage = meta.page; sheet.setAttribute('aria-label', `Page ${meta.page} of ${data.page_count}: ${pageLabel(meta)}`);
        sheet.innerHTML = `<h3 class="packet-page-heading">Page ${meta.page} of ${data.page_count} - ${escape(pageLabel(meta))}${meta.source_page ? ` (${meta.kind.startsWith('report')?'report':'document'} page ${meta.source_page})` : ''}</h3>${meta.kind === 'instructions' ? '<p class="note">For you only. Remove this page before sending.</p>' : ''}<div class="packet-sheet-scroll"><div class="packet-sheet" style="aspect-ratio:${meta.page_width}/${meta.page_height}"><img alt="${escape(pageLabel(meta))} - page ${meta.page}" class="packet-page-image"></div></div>`;
        list.append(sheet);
        if (meta.grouped_identification) {
          const copies = document.createElement('div'); copies.className = 'evidence';
          const note = document.createElement('p'); note.textContent = 'These identification images share one printed page. Check that each copy is complete and readable.';
          const names = document.createElement('ol');
          for (const source of meta.sources || []) { const name = document.createElement('li'); name.textContent = source.filename || 'Identification copy'; names.append(name); }
          copies.append(note, names); sheet.insertBefore(copies, sheet.querySelector('.packet-sheet-scroll'));
        }
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
      root.querySelector('#packet-page-zoom').onchange = event => {for(const paper of root.querySelectorAll('.packet-sheet'))paper.style.width=event.target.value==='readable'?'max(100%, 960px)':event.target.value+'%';};
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
