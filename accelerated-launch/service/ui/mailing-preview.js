'use strict';

// Invented values for visual review only. A real integration must fetch and verify a current provider quote.
const options = {
  CA: { currency: 'CAD', services: [
    { code: 'CA_LETTERMAIL', name: 'Standard mail', detail: 'No delivery signature', base: 440, extra: 22 },
    { code: 'CA_REGISTERED', name: 'Registered Mail', detail: 'Proof of mailing and delivery signature', base: 1370, extra: 22 }
  ] },
  US: { currency: 'USD', services: [
    { code: 'US_FIRST_CLASS', name: 'First-Class Mail', detail: 'Standard letter delivery', base: 360, extra: 18 },
    { code: 'US_CERTIFIED', name: 'Certified Mail', detail: 'Mailing receipt and delivery record', base: 930, extra: 18 },
    { code: 'US_CERTIFIED_RETURN_RECEIPT', name: 'Certified Mail with return receipt', detail: 'Additional delivery proof', base: 1310, extra: 18 }
  ] },
  GB: { currency: 'GBP', services: [
    { code: 'GB_FIRST_CLASS', name: '1st Class', detail: 'Standard letter delivery', base: 315, extra: 15 },
    { code: 'GB_FIRST_CLASS_SIGNED_FOR', name: '1st Class Signed For', detail: 'Delivery signature', base: 690, extra: 15 }
  ] },
  AU: { currency: 'AUD', services: [
    { code: 'AU_REGULAR', name: 'Regular Post', detail: 'Standard letter delivery', base: 410, extra: 20 },
    { code: 'AU_REGISTERED', name: 'Registered Post', detail: 'Tracking and delivery signature', base: 1170, extra: 20 }
  ] }
};

const country = document.getElementById('country');
const pages = document.getElementById('pages');
const services = document.getElementById('services');
let selected = 'CA_REGISTERED';
const setText = (id, value) => { document.getElementById(id).textContent = value; };
const money = (minor, currency) => new Intl.NumberFormat('en', { style: 'currency', currency }).format(minor / 100);

function renderServices() {
  const available = options[country.value].services;
  if (!available.some(service => service.code === selected)) selected = available[1].code;
  services.replaceChildren();
  for (const service of available) {
    const label = document.createElement('label');
    label.className = 'service';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'postal-service';
    input.value = service.code;
    input.checked = service.code === selected;
    input.addEventListener('change', () => { selected = input.value; renderPrice(); });
    const content = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = service.name;
    const detail = document.createElement('small');
    detail.textContent = service.detail;
    content.append(name, detail);
    label.append(input, content);
    services.append(label);
  }
  renderPrice();
}

function renderPrice() {
  const setting = options[country.value];
  const service = setting.services.find(item => item.code === selected);
  const count = Number(pages.value);
  const providerMinor = service.base + (count - 1) * service.extra;
  const consumerMinor = Math.ceil(providerMinor * 1.5);
  setText('packetPages', String(count));
  setText('price', money(consumerMinor, setting.currency));
  setText('serviceSummary', `${service.name} · ${count} pages`);
  setText('providerCost', money(providerMinor, setting.currency));
  setText('markup', money(consumerMinor - providerMinor, setting.currency));
  setText('consumerSubtotal', money(consumerMinor, setting.currency));
  setText('dialogService', service.name);
  setText('dialogPrice', money(consumerMinor, setting.currency));
}

country.addEventListener('change', renderServices);
pages.addEventListener('change', renderPrice);
const dialog = document.getElementById('approvalDialog');
document.getElementById('previewNext').addEventListener('click', () => dialog.showModal());
document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
document.getElementById('backDialog').addEventListener('click', () => dialog.close());
renderServices();
